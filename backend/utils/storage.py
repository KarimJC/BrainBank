import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
BUCKET_NAME = "attachments"
MAX_RETRIES = 3

_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def upload_file(data: bytes, path: str, mime_type: str) -> str:
    for attempt in range(MAX_RETRIES):
        try:
            _client.storage.from_(BUCKET_NAME).upload(
                path=path,
                file=data,
                file_options={"content-type": mime_type, "upsert": "true"},
            )
            return _client.storage.from_(BUCKET_NAME).get_public_url(path)
        except Exception:
            if attempt < MAX_RETRIES - 1:
                time.sleep(1 * (attempt + 1))
            else:
                raise


def delete_file(path: str) -> None:
    _client.storage.from_(BUCKET_NAME).remove([path])