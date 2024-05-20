from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from aiohttp.web import Request


async def validate_parameters(
  request: Request, params: list[str]
) -> tuple[bool, str]:
  parameters = await request.json()
  for param in params:
    if param not in parameters:
      return False, param
  return True, ""
