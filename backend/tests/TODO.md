# Test Suite TODOs — Skipped/Deferred Areas

This file documents areas intentionally excluded from the test suite and the reasons why.

---

## 1. `api/routes/course_section.py` — `get_students_in_section` endpoint

**Endpoint**: `GET /api/v1/course-sections/{section_id}/students`

**Issue**: The module starts with `from venv import logger`. Although this import
happens to succeed on Python 3.12 (the `venv` module has a `logger` attribute as an
implementation detail), it is a fragile, unintentional import — the author meant to
use `import logging; logger = logging.getLogger(__name__)`.

**Status**: Verified that the import works on the current Python version, so no
production code change was required to run the other tests in the module. However,
`get_students_in_section` itself uses `logger.error(...)` directly — if the `venv`
module ever removes that attribute, this endpoint crashes at import time.

**Recommended fix**:
```python
# Replace line 1 of api/routes/course_section.py:
# from venv import logger
import logging
logger = logging.getLogger(__name__)
```

**Why not tested**: The endpoint's internal cursor access pattern bypasses the CRUD
layer and uses `RealDictCursor` directly. Integration-testing it requires a live
Postgres connection. A unit test would be a trivial cursor mock with no value beyond
what other endpoints already cover.

---

## 2. `api/routes/notes.py` — POST / PUT endpoints

**Endpoints**:
- `POST /api/v1/notes` (`create_note_endpoint`)
- `PUT  /api/v1/notes/{note_id}` (`update_note_endpoint`)

**Issue**: These endpoints involve:
- Multipart form uploads (`UploadFile`)
- OCR extraction via `pytesseract` / `fitz` (PyMuPDF) — external binaries required
- Supabase storage uploads (`upload_file`, `delete_file`) — real network calls
- Complex error-cleanup logic (delete already-uploaded files on partial failure)

Testing these correctly requires either a running Supabase instance or extensive
mock orchestration that mirrors the exact control flow. The risk of false-positive
tests is high.

**Recommended approach**: Integration/E2E tests using a test Supabase project bucket
and a real Postgres database, or refactor into smaller, testable units (separate
upload, OCR, and DB steps).

---

## 3. `api/routes/message.py` — `chat_websocket`

**Endpoint**: `WebSocket /ws/{user_id}`

**Issue**: WebSocket testing requires a specialized async test client (e.g.,
`fastapi.testclient.TestClient` can handle WebSockets but the logic is tightly
coupled to the database CRUD and `ConnectionManager`). The handler mixes
connection management, message parsing, database writes, and recipient lookups in
one loop, making reliable unit testing brittle.

**Recommended approach**: Refactor into smaller functions (parse message, save to DB,
send to recipient) that can each be unit-tested separately. Then test the handler
with an async WebSocket test client.

---

## 4. `utils/storage.py`

**Issue**: The module creates a real Supabase client at import time:
```python
_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
```
We stub the env vars in conftest.py so import succeeds (with a mocked `create_client`),
but unit-testing `upload_file` and `delete_file` would just be testing a mock of
`_client.storage`. The real behaviour requires a live Supabase storage bucket.

**Recommended approach**: Inject the client via dependency injection or a factory
function so it can be swapped in tests.

---

## 5. `utils/ocr.py` — `extract_text_from_image`, `extract_text_from_pdf`, `extract_text`

**Issue**: These functions depend on:
- `pytesseract` — requires Tesseract OCR binary installed on the system
- `fitz` (PyMuPDF) — PDF rendering library
- `PIL.Image` — image processing

Integration tests would require actual image/PDF fixtures and system binaries.

**What IS tested**: `_clean_ocr_text` is purely algorithmic (string manipulation)
and is fully covered in `tests/unit/test_ocr_cleaning.py`.

---

## 6. `db/connection.py` — `init_pool`, `get_db`, `close_pool`

**Issue**: These manage a global `ThreadedConnectionPool` backed by a real Postgres
connection string. Testing them requires a running Postgres instance. The `get_db`
generator is overridden in `conftest.py` for all route tests, removing the need to
test it directly.

**Recommended approach**: Integration tests with a test database (e.g., Docker-based
Postgres in CI).

---

## 7. `scripts/` directory and `telemetry.py`

**Out of scope**: These are operational/maintenance scripts. `telemetry.py` emits
OpenTelemetry spans and is not part of the API surface.

---

## Summary Table

| Area | Reason Skipped | Priority Fix |
|------|---------------|--------------|
| `course_section.get_students_in_section` | Direct cursor usage, logger import smell | Fix logger import |
| `notes.create_note_endpoint` | Multipart + OCR + Supabase | Integration test |
| `notes.update_note_endpoint` | Same as above | Integration test |
| `message.chat_websocket` | WebSocket coupling | Refactor + async test |
| `utils/storage.py` | Module-level Supabase client | Dependency injection |
| `utils/ocr.py` (image/PDF) | External binary dependencies | System-level test |
| `db/connection.py` | Real Postgres needed | Integration test |
| `scripts/`, `telemetry.py` | Out of scope | N/A |
