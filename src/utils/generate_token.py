from __future__ import annotations

import string
import random
from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from asyncpg import Connection

character_pool: str = string.ascii_letters + string.digits

async def generate_token_user(
  conn: Connection, length: int
) -> str:
  token: str = "".join(random.choices(character_pool, k=length))
  exists = (
    await conn.fetchrow(
      "SELECT EXISTS ( SELECT 1 FROM Users WHERE Token ILIKE $1)",
      token,
    )
  )["exists"]
  if exists:
    return await generate_token_user(conn, length)
  else:
    return token

async def generate_token_apikey(
  conn: Connection, length: int
) -> str:
  token: str = "".join(random.choices(character_pool, k=length))
  exists = (
    await conn.fetchrow(
      "SELECT EXISTS ( SELECT 1 FROM APIKeys WHERE KeyID ILIKE $1)",
      token,
    )
  )["exists"]
  if exists:
    return await generate_token_apikey(conn, length)
  else:
    return token