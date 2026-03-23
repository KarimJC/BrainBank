import os
from psycopg2 import connect
from psycopg2.extensions import connection as Connection
from dotenv import load_dotenv

load_dotenv()


def get_db() -> Connection:
    """Get database connection"""
    conn = None
    try:
        conn = connect(os.getenv("DATABASE_URL"))
        yield conn
    finally:
        conn.close()
        if conn:
            conn.close()
