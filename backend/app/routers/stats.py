from fastapi import APIRouter, Depends, Query
from supabase import Client
from app.dependencies import get_supabase_client

router = APIRouter()


@router.get("/team/{team_id}")
async def get_team_stats(
    team_id: str,
    season: int | None = Query(None, description="Filter by season year"),
    sb: Client = Depends(get_supabase_client),
):
    result = sb.rpc("get_team_stats", {"p_team_id": team_id, "p_season": season}).execute()
    return result.data
