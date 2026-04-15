import os
import time
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

TERM = "202630"
BASE = "https://nubanner.neu.edu/StudentRegistrationSsb/ssb"
SLEEP = 0.5


def get_conn():
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0"})
    return s


def get_section_faculty(session: requests.Session, crn: int) -> tuple[str, str]:
    """Fetch professor name + email for a single CRN from Banner."""
    try:
        resp = session.get(
            f"{BASE}/searchResults/getFacultyMeetingTimes",
            params={"term": TERM, "courseReferenceNumber": crn},
            timeout=10
        )
        data = resp.json()
        fmt = data.get("fmt", [])
        if fmt and fmt[0].get("faculty"):
            faculty = fmt[0]["faculty"][0]
            name = faculty.get("displayName", "Staff") or "Staff"
            email = faculty.get("emailAddress", "") or ""
            return name, email
    except Exception:
        pass
    return "Staff", ""


def get_or_create_professor(cursor, name: str, email: str) -> int:
    """Get existing professor by name or insert a new one."""
    cursor.execute("SELECT professor_id FROM professor WHERE name = %s", (name,))
    row = cursor.fetchone()
    if row:
        return row["professor_id"]
    cursor.execute(
        "INSERT INTO professor (name, email) VALUES (%s, %s) RETURNING professor_id",
        (name, email)
    )
    return cursor.fetchone()["professor_id"]


def fix_staff():
    conn = get_conn()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    session = make_session()

    # Get all sections currently assigned to Staff
    cursor.execute("""
        SELECT cs.id, cs."course_CRN"
        FROM course_section cs
        JOIN professor p ON cs.professor_id = p.professor_id
        WHERE p.name = 'Staff'
    """)
    staff_sections = cursor.fetchall()
    total = len(staff_sections)
    print(f"Found {total} sections assigned to Staff. Starting fix...\n")

    updated = 0
    still_staff = 0

    for i, sec in enumerate(staff_sections):
        section_id = sec["id"]
        crn = sec["course_CRN"]

        prof_name, prof_email = get_section_faculty(session, crn)
        time.sleep(SLEEP)

        if prof_name == "Staff":
            still_staff += 1
        else:
            prof_id = get_or_create_professor(cursor, prof_name, prof_email)
            cursor.execute(
                "UPDATE course_section SET professor_id = %s WHERE id = %s",
                (prof_id, section_id)
            )
            conn.commit()
            updated += 1

        if (i + 1) % 50 == 0:
            print(f"  ...processed {i + 1}/{total} | updated: {updated} | still Staff: {still_staff}")

    cursor.close()
    conn.close()

    print("\n── Fix complete ──────────────────────────")
    print(f"  Updated to real professor:  {updated}")
    print(f"  Still Staff (Banner has no data):  {still_staff}")
    print("──────────────────────────────────────────")


if __name__ == "__main__":
    fix_staff()