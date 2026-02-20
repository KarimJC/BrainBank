import os
from psycopg2 import connect
from psycopg2.extensions import connection as Connection
from dotenv import load_dotenv

load_dotenv()

def get_db() -> Connection:
    """Get database connection"""
    conn = None
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url or database_url == "database_url_here":
            raise ValueError(
                "DATABASE_URL environment variable is not set or is still a placeholder. "
                "Please set DATABASE_URL in your .env file or environment variables."
            )
        
        # Fix connection string if it starts with // instead of postgresql://
        if database_url.startswith("//"):
            database_url = "postgresql:" + database_url
            print(f"⚠️  Fixed DATABASE_URL: prepended 'postgresql:' to connection string")
        elif not database_url.startswith(("postgresql://", "postgres://")):
            # If it doesn't start with a known protocol, try to add postgresql://
            if "://" not in database_url:
                database_url = "postgresql://" + database_url
                print(f"⚠️  Fixed DATABASE_URL: added 'postgresql://' protocol")
        
        conn = connect(database_url)
        yield conn
    except Exception as e:
        # Re-raise the exception so FastAPI can handle it
        raise
    finally:
        # Only close if connection was successfully created
        if conn is not None:
            conn.close()