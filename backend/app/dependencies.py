from supabase import create_client, Client
from app.config import settings
import functools


@functools.lru_cache()
def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
