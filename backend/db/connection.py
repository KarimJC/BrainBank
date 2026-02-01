import os
from psycopg2 import connect
from psycopg2.extensions import connection as Connection
from dotenv import load_dotenv

load_dotenv()

def get_db() -> Connection:
    """Get database connection"""
    try:
        conn = connect(os.getenv("postgresql://postgres.acwlniaolnhyqspatwaj:R7KFBuKIqeJANtRl@aws-0-us-west-2.pooler.supabase.com:6543/postgres"))
        yield conn
    finally:
        conn.close()