from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from asyncpg import Connection

async def get_project_user_count(project_id: int, conn: Connection) -> int:
  record = await conn.fetchrow("SELECT COUNT(*) FROM Authorizations WHERE ProjectID = $1 AND Allowed = 1;", project_id)
  return record.get("count", 0)