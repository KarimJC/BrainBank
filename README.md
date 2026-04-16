# BrainBank

BrainBank is a note-taking and study collaboration platform built for Northeastern University students. It combines course-organized notes, real-time peer messaging, and an AI-powered tutor to help students study smarter.

---

## Features

### Notes
- Create, upload, and manage notes organized by course section
- Attach images and PDFs; text is extracted via OCR automatically
- Browse and access notes shared across course sections

### Courses
- Browse courses and course sections
- View professor information linked to each section

### Real-Time Messaging
- Direct messaging between users via WebSockets
- Messages delivered instantly if the recipient is online; stored for later otherwise

### AI Tutor (BrainBot)
- Course-specific AI chatbot powered by Google Gemini
- Uses your uploaded notes and documents as context for answers
- Maintains conversation history per user per course section

### Authentication
- Supabase-based JWT authentication
- Persistent sessions on the frontend via AsyncStorage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo), TypeScript, Expo Router |
| Backend | Python, FastAPI, PostgreSQL |
| Auth | Supabase Auth (JWT / EC256) |
| AI | Google Gemini API |
| Realtime | WebSockets |
| File Processing | PyPDF2, pdf2image, pytesseract (OCR) |
| Observability | OpenTelemetry + Jaeger |
| Infrastructure | Docker, Docker Compose |

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js + npm
- Python 3.11+
- Expo CLI (`npm install -g expo-cli`)

### Running the App

**Start Jaeger for tracing with Docker Compose**:
```bash
docker-compose up
```

**Or use the Makefile:**
```bash
make dev        # Run backend and frontend in parallel
make backend    # Backend only (http://0.0.0.0:8000)
make frontend   # Frontend only (Expo)
```

**or running them individually:**

*backend*:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000;
```
*frontend*:
```bash
npx expo start --clear
```

**Jaeger tracing UI:** http://localhost:16686

---

## Project Structure

```
/backend
  ├── main.py               # FastAPI app entry point
  ├── auth.py               # JWT verification
  ├── telemetry.py          # OpenTelemetry setup
  ├── api/routes/           # API endpoints (notes, courses, chat, messages, users)
  ├── db/crud/              # Database operations
  └── core/                 # AI service, PDF processing

/frontend
  ├── app/(auth)/           # Login & signup screens
  ├── app/(tabs)/           # Main tabs: Notes, Courses, Chat, BrainBot, Profile
  └── services/             # API clients and Supabase config
```

---

## Environment Variables

Create a `.env` file in `/backend` with:

```
DATABASE_URL=...
SUPABASE_JWT_X=...
SUPABASE_JWT_Y=...
GEMINI_API_KEY=...
```

Create a `.env` in `/frontend` with your Supabase project URL and anon key.
