"""
Seed script: pulls NEU course data directly from NUBanner and populates
the professor, course, and course_section tables.

Usage (from backend/ directory with venv active):
    python scripts/seed_from_banner.py
"""

import os
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────

TERM = "202630"  # Spring 2026 Semester
SUBJECTS_FILTER = ["CS", "MATH", "EECE", "DS", "CY", "IS", "ENGW"]
PAGE_SIZE = 500
BASE = "https://nubanner.neu.edu/StudentRegistrationSsb/ssb"

# ── DB helpers ────────────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def get_or_create_professor(cursor, name: str, email: str = "") -> int:
    cursor.execute("SELECT professor_id FROM professor WHERE name = %s", (name,))
    row = cursor.fetchone()
    if row:
        return row["professor_id"]
    cursor.execute(
        "INSERT INTO professor (name, email) VALUES (%s, %s) RETURNING professor_id",
        (name, email)
    )
    return cursor.fetchone()["professor_id"]

def get_or_create_course(cursor, subject: str, course_number: str, title: str) -> int:
    course_code = f"{subject}{course_number}"
    cursor.execute("SELECT id FROM course WHERE title = %s", (course_code,))
    row = cursor.fetchone()
    if row:
        return row["id"]
    cursor.execute(
        "INSERT INTO course (course, title, subject) VALUES (%s, %s, %s) RETURNING id",
        (title, course_code, subject)
    )
    return cursor.fetchone()["id"]

def crn_exists(cursor, crn: int) -> bool:
    cursor.execute('SELECT 1 FROM course_section WHERE "course_CRN" = %s', (crn,))
    return cursor.fetchone() is not None

# ── Banner session ────────────────────────────────────────────────────────────

def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0"})
    return s

def select_term(session: requests.Session, subject: str):
    """Banner requires term + subject selection before each search."""
    # Reset any previous search state
    session.post(f"{BASE}/classSearch/resetDataForm", timeout=15)
    # Select term and subject
    session.post(
        f"{BASE}/term/search?mode=search",
        data={"term": TERM},
        timeout=15
    )
    session.get(
        f"{BASE}/classSearch/classSearch",
        params={"term": TERM, "subject": subject},
        timeout=15
    )

def fetch_sections(session: requests.Session, subject: str) -> list[dict]:
    """Fetch all sections for a subject from Banner."""
    all_sections = []
    offset = 0

    while True:
        print(f"    fetching offset={offset}...")
        try:
            resp = session.get(
                f"{BASE}/searchResults/searchResults",
                params={
                    "txt_subject": subject,
                    "txt_term": TERM,
                    "pageOffset": offset,
                    "pageMaxSize": PAGE_SIZE,
                    "sortColumn": "subjectDescription",
                    "sortDirection": "asc",
                },
                timeout=20
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"    ERROR at offset {offset}: {e}")
            break

        sections = data.get("data") or []
        total = data.get("totalCount") or 0
        print(f"    got {len(sections)} sections (total={total})")

        if not sections:
            break

        all_sections.extend(sections)
        offset += PAGE_SIZE

        if offset >= total:
            break

        time.sleep(0.5)

    return all_sections

# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    conn = get_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    session = make_session()

    total_sections = 0
    total_skipped = 0

    for subject in SUBJECTS_FILTER:
        print(f"\n  [{subject}] setting up Banner session...")
        try:
            select_term(session, subject)
        except Exception as e:
            print(f"  ERROR setting up session for {subject}: {e}")
            continue

        print(f"  [{subject}] fetching sections...")
        sections = fetch_sections(session, subject)
        print(f"  [{subject}] total sections fetched: {len(sections)}")

        # Collect unique profs and courses first
        profs = {}   # name -> email
        courses = {} # course_code -> (subject, number, title)
        valid_sections = []

        for sec in sections:
            crn = sec.get("courseReferenceNumber")
            course_number = sec.get("courseNumber", "")
            course_title = sec.get("courseTitle", "Unknown")
            subject_code = sec.get("subject", subject)
            if not crn or not course_number:
                continue
            faculty = sec.get("faculty") or []
            prof_name = faculty[0].get("displayName", "Staff") if faculty else "Staff"
            prof_email = faculty[0].get("emailAddress", "") if faculty else ""
            profs[prof_name] = prof_email
            course_code = f"{subject_code}{course_number}"
            courses[course_code] = (subject_code, course_number, course_title)
            valid_sections.append((int(crn), course_code, prof_name))

        # Bulk upsert professors
        if profs:
            cursor.executemany(
                "INSERT INTO professor (name, email) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING",
                list(profs.items())
            )
            conn.commit()

        # Bulk upsert courses
        if courses:
            cursor.executemany(
                "INSERT INTO course (course, title, subject) VALUES (%s, %s, %s) ON CONFLICT (title) DO NOTHING",
                [(title, code, subj) for code, (subj, _, title) in courses.items()]
            )
            conn.commit()

        # Fetch professor_id and course_id maps in bulk
        cursor.execute("SELECT professor_id, name FROM professor WHERE name = ANY(%s)", (list(profs.keys()),))
        prof_map = {row["name"]: row["professor_id"] for row in cursor.fetchall()}

        cursor.execute("SELECT id, title FROM course WHERE title = ANY(%s)", (list(courses.keys()),))
        course_map = {row["title"]: row["id"] for row in cursor.fetchall()}

        # Bulk insert sections
        section_rows = []
        for crn, course_code, prof_name in valid_sections:
            course_id = course_map.get(course_code)
            professor_id = prof_map.get(prof_name)
            if course_id and professor_id:
                section_rows.append((course_id, crn, professor_id))

        if section_rows:
            cursor.executemany(
                'INSERT INTO course_section (course_id, "course_CRN", professor_id) VALUES (%s, %s, %s) ON CONFLICT ("course_CRN") DO NOTHING',
                section_rows
            )
            conn.commit()
            total_sections += len(section_rows)

        print(f"  [{subject}] done. inserted {len(section_rows)} sections.")

    cursor.close()
    conn.close()

    print("\n── Seeding complete ──────────────────────")
    print(f"  Sections inserted:  {total_sections}")
    print(f"  Sections skipped:   {total_skipped}")
    print("──────────────────────────────────────────")

if __name__ == "__main__":
    seed()