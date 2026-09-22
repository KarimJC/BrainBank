# BrainBank — Architecture

BrainBank is a mobile notes-sharing app for university students. Students enroll in course sections, upload notes (photos/PDFs), message classmates in real time, and use an AI tutor ("BrainBot") scoped to their courses.

**Stack:** React Native (Expo) · FastAPI (Python) · PostgreSQL · Supabase (Auth + Storage) · Google Gemini · Redis · WebSockets

---

## System Overview

```mermaid
flowchart TB
    subgraph Client["📱 Mobile App — React Native / Expo Router"]
        UI["Screens<br/>Home · Notes · Chat · Profile · BrainBot"]
        API["API Service Layer<br/>services/api.ts<br/>attaches JWT · resolves base URL"]
        SB_C["Supabase Client<br/>session + token refresh<br/>(AsyncStorage)"]
        UI --> API
        UI --> SB_C
    end

    subgraph Backend["⚙️ FastAPI Backend — uvicorn :8000, /api/v1"]
        AUTH["Auth Middleware<br/>auth.py<br/>verify Supabase JWT (ES256/JWK)"]
        ROUTES["Route Handlers<br/>notes · courses · course_section<br/>user · ai_chat · message<br/>conversation · document · professor"]
        WS["WebSocket Manager<br/>/ws/{user_id}<br/>real-time messaging"]
        AISVC["AI Service<br/>core/ai_service.py<br/>builds course-scoped prompt"]
        CRUD["CRUD Layer<br/>raw SQL via psycopg2<br/>ThreadedConnectionPool"]

        AUTH --> ROUTES
        ROUTES --> AISVC
        ROUTES --> CRUD
        WS --> CRUD
        AISVC --> CRUD
    end

    subgraph External["☁️ External Services"]
        PG[("PostgreSQL<br/>users · courses · sections<br/>notes · messages · ai_chat<br/>documents")]
        SB_AUTH["Supabase Auth<br/>login · JWT signing"]
        STORE["Supabase Storage<br/>'attachments' bucket<br/>images / PDFs"]
        GEMINI["Google Gemini API<br/>gemini-2.5-flash"]
        REDIS[("Redis<br/>profile/convo cache<br/>5-min TTL")]
    end

    API -->|"HTTPS · Bearer token"| AUTH
    API -.->|"WebSocket"| WS
    SB_C -->|"sign in / refresh"| SB_AUTH

    CRUD --> PG
    CRUD -.->|cache| REDIS
    ROUTES -->|"upload files"| STORE
    AISVC -->|"prompt + context"| GEMINI
    AUTH -.->|"verify via public JWK"| SB_AUTH

    classDef client fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef backend fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef ext fill:#fef3c7,stroke:#d97706,color:#78350f;
    class UI,API,SB_C client;
    class AUTH,ROUTES,WS,AISVC,CRUD backend;
    class PG,SB_AUTH,STORE,GEMINI,REDIS ext;
```

---

## Highlight: AI Tutor (BrainBot) Request Flow

The chatbot is grounded in the student's own course material — it isn't a generic LLM wrapper.

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as FastAPI /ai-chat
    participant DB as PostgreSQL
    participant AI as AI Service
    participant G as Gemini 2.5 Flash

    U->>App: Ask a question (course-scoped)
    App->>API: POST /api/v1/ai-chat (Bearer JWT)
    API->>API: Verify JWT (ES256)
    API->>DB: Fetch notes + OCR text + documents<br/>for this section (or all sections)
    API->>DB: Fetch last 10 chat messages
    API->>AI: Build system prompt + context + history
    AI->>G: Generate response
    G-->>AI: Answer (markdown)
    AI->>DB: Store user + assistant messages<br/>(+ token estimate)
    API-->>App: Response
    App-->>U: Render answer
```

**On-demand generation** reuses the same context pipeline: study guides, practice exams, and course summaries (`/ai-chat/study-guide`, `/practice-exam`, `/course-summary`), persisted to the `document` table and exportable as PDF.

---

## Highlight: Notes Upload Pipeline

```mermaid
flowchart LR
    A["Pick media<br/>ImagePicker / DocumentPicker<br/>JPEG·PNG·HEIC·PDF, ≤10MB"] --> B["POST /api/v1/notes<br/>multipart/form-data"]
    B --> C["Validate<br/>MIME type + size"]
    C --> D["Upload to Supabase Storage<br/>'attachments' bucket"]
    C --> E["OCR text extraction<br/>utils/ocr.py"]
    D --> F["Store metadata in Postgres<br/>attachments JSONB + notes_content"]
    E --> F
    F --> G["Return public URLs"]

    classDef step fill:#ede9fe,stroke:#7c3aed,color:#4c1d95;
    class A,B,C,D,E,F,G step;
```

OCR-extracted text lands in `notes_content`, which both powers search **and** feeds the AI tutor's context.

---

## Highlight: Real-Time Messaging

Direct messaging between classmates runs over a **WebSocket** with a REST fallback, plus a **store-and-forward** guarantee so no message is lost when the recipient is offline.

### Components

```mermaid
flowchart TB
    subgraph A["📱 Sender — conversation/[id].tsx"]
        SA["Optimistic UI<br/>append immediately"]
        WSA["WebSocket client<br/>reconnect: 5× exp. backoff"]
        RESTA["REST fallback<br/>sendMessage()"]
    end

    subgraph B["📱 Recipient — conversation/[id].tsx"]
        WSB["WebSocket client<br/>onmessage → append if convo matches"]
    end

    subgraph SRV["⚙️ FastAPI message.py"]
        WSEP["WS endpoint /ws/{user_id}"]
        CM["ConnectionManager<br/>{ user_id → socket }<br/>tracks who's online"]
        RESTEP["POST /messages<br/>(auth: JWT)"]
    end

    DB[("PostgreSQL<br/>message · conversation")]

    SA -.-> WSA
    WSA -->|"{conversation_id, content}"| WSEP
    RESTA -->|"if socket closed"| RESTEP
    WSEP -->|"1 · save message"| DB
    WSEP -->|"2 · look up conversation<br/>resolve recipient_id"| DB
    WSEP --> CM
    CM -->|"3 · push if recipient online"| WSB
    RESTEP --> DB

    classDef c fill:#dbeafe,stroke:#2563eb,color:#1e3a8a;
    classDef s fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef d fill:#fef3c7,stroke:#d97706,color:#78350f;
    class SA,WSA,RESTA,WSB c;
    class WSEP,CM,RESTEP s;
    class DB d;
```

### Send-message sequence

```mermaid
sequenceDiagram
    actor A as Sender
    participant SC as Sender App
    participant WS as WS /ws/{user_id}
    participant CM as ConnectionManager
    participant DB as PostgreSQL
    participant RC as Recipient App

    Note over SC: On screen open — load history<br/>GET /messages (paginated) + mark read
    A->>SC: Type & send
    SC->>SC: Append optimistic message

    alt Socket OPEN
        SC->>WS: send { conversation_id, content }
        WS->>DB: create_message (persist)
        WS->>DB: get_conversation → resolve recipient_id
        WS->>CM: send_message(recipient_id, payload)
        alt Recipient online
            CM-->>RC: push message → append to thread
        else Recipient offline
            Note over CM,DB: no socket — message already saved;<br/>delivered on next GET /messages (store-and-forward)
        end
    else Socket closed
        SC->>WS: (unavailable) → REST fallback
        SC->>DB: POST /messages (JWT-authed) persists
        Note over SC: on failure, optimistic message rolled back
    end
```

### Conversation lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: create_conversation
    pending --> accepted: recipient accepts
    pending --> declined: recipient declines
    accepted --> blocked: either user blocks<br/>(records blocked_by)
    blocked --> accepted: unblock
    declined --> [*]
```

**Notes for the interview:**
- **Optimistic UI** — the sender's message renders instantly; the WS echo carries the server-assigned `message_id`.
- **Delivery guarantee** — the server *always persists first*, then attempts a live push. Offline recipients get the message on their next history fetch. No dropped messages.
- **Resilience** — the client auto-reconnects (1s→16s exponential backoff, 5 attempts) and falls back to `POST /messages` if the socket is down.
- **Read tracking & blocking** — `POST /conversations/{id}/read` records read state; conversation status gates whether messaging is allowed.
- ⚠️ **Known gap:** the WS endpoint trusts the `user_id` in the URL and isn't JWT-verified (unlike `POST /messages`). Worth calling out honestly as a hardening next step.

---

## Key Design Decisions

| Area | Choice | Notes |
|---|---|---|
| **Auth** | Supabase JWT, verified backend-side via ES256 public JWK | Backend never holds credentials; frontend handles refresh |
| **Data access** | Raw SQL (psycopg2) + ThreadedConnectionPool, no ORM | Explicit queries, pooled connections |
| **AI grounding** | Gemini prompt built from student's own notes + OCR + recent history | Course-scoped, not a generic chatbot |
| **File storage** | Supabase Storage (`attachments` bucket), URLs in Postgres | Files out of the DB; metadata in JSONB |
| **Real-time** | WebSocket `/ws/{user_id}` with store-and-forward | Instant if online, delivered on reconnect |
| **Caching** | Redis (optional), 5-min TTL on profiles/conversations | Graceful degradation if absent |
| **Dev UX** | Backend host auto-detected from Expo `hostUri` | No manual IP config for physical-device testing |

---

## Talking Points for the Interview

- **Clean layering:** screens → API service → auth → routes → CRUD → Postgres. Each domain has a matching route + CRUD module.
- **The AI feature is the differentiator:** retrieval of the student's *own* notes (incl. OCR'd handwriting/PDFs) as grounding context — a lightweight RAG-style pattern over per-user, per-course data.
- **Security posture:** stateless JWT verification with an asymmetric key, so the API trusts Supabase-signed tokens without a shared secret.
- **Pragmatic tradeoffs:** raw SQL over an ORM for control; optional Redis/Jaeger so the app runs fully without them in dev.
