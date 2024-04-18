from __future__ import annotations

import string
import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from asyncpg import Connection

character_pool: str = string.ascii_letters + string.digits

async def generate_token(conn: Connection, table: str, column: str, length: int) -> str:
  token: str = "".join(random.choices(character_pool, k=length))
  exists = (await conn.execute("SELECT EXISTS ( SELECT 1 FROM $1 WHERE $2 ILIKE $3)", table, column, token))["exists"]
  if exists:
    return await generate_token(conn, table, column, length)
  else:
    return token