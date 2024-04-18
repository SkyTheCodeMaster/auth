from __future__ import annotations

import asyncio
import hashlib
from typing import TYPE_CHECKING
from utils.models.config import config

if TYPE_CHECKING:
  from typing import Any, Coroutine


def hash(passwd: str, username: str) -> str:
  "Returns a SHA512 hash of the password."
  salt = hashlib.sha512(username.encode()).digest()
  output_hash = hashlib.pbkdf2_hmac("sha512", passwd.encode(), salt, config.SECURITY.HASH_ITERS).hex()
  return output_hash

async def ahash(passwd: str, username: str) -> Coroutine[Any, Any, str]:
  loop = asyncio.get_running_loop()
  result = await loop.run_in_executor(None, hash, passwd, username)
  return result