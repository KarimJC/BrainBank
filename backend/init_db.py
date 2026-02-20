#!/usr/bin/env python3
"""
Database initialization script.
Creates the notes table if it doesn't exist.
"""
import os
import sys
from psycopg2 import connect
from dotenv import load_dotenv

load_dotenv()

def init_database():
    """Initialize the database by creating the notes table"""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url or database_url == "database_url_here":
        print("❌ ERROR: DATABASE_URL is not set in .env file")
        sys.exit(1)
    
    # Fix connection string if needed
    if database_url.startswith("//"):
        database_url = "postgresql:" + database_url
    elif not database_url.startswith(("postgresql://", "postgres://")):
        if "://" not in database_url:
            database_url = "postgresql://" + database_url
    
    try:
        print("🔌 Connecting to database...")
        conn = connect(database_url)
        cursor = conn.cursor()
        
        print("📝 Creating notes table...")
        
        # Create notes table - matching the schema expected by the code
        # Note: attachments is JSONB (not jsonb[]) - it stores a JSON array as a single JSONB value
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                note_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                date_uploaded VARCHAR(10) NOT NULL,
                notes_content TEXT,
                attachments JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if table exists and alter attachments column if it's jsonb[]
        cursor.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'notes' 
                    AND column_name = 'attachments' 
                    AND data_type = 'ARRAY'
                ) THEN
                    ALTER TABLE notes ALTER COLUMN attachments TYPE JSONB USING attachments::text::jsonb;
                END IF;
            END $$;
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_user_id 
            ON notes(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_course_id 
            ON notes(course_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_notes_created_at 
            ON notes(created_at DESC)
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ Database initialized successfully!")
        print("   - Created 'notes' table")
        print("   - Created indexes for course_instance and created_at")
        
    except Exception as e:
        print(f"❌ ERROR: Failed to initialize database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()

