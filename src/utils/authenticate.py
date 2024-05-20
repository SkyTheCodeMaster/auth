# Handle authentication and request verification
from __future__ import annotations

from typing import TYPE_CHECKING
from aiohttp.web import Response
from .models.key import Key
from .models.user import User

if TYPE_CHECKING:
  from aiohttp.web import Application, Request
  from asyncpg import Connection, Pool
  from .models.config import Table


async def get_user(
  conn: Connection, *, token: str = None, name: str = None
) -> User:
  user_record = await conn.fetchrow(
    "SELECT * FROM Users WHERE Token = $1 OR Username = $2;", token, name
  )
  return User.from_record(user_record)


async def authenticate(request: Request) -> Key | User | Response:
  app: Application = request.app
  pool: Pool = app.pool
  config: Table = app.config

  # We prioritize header authentication over cookie authentication.
  auth_token = request.cookies.get("Authorization", None)
  auth_token = request.headers.get("Authorization", auth_token)

  if auth_token is None:
    return Response(
      status=401, body="pass Authorization header or Authorization cookie."
    )

  auth_token = auth_token.removeprefix("Bearer ")

  # Now the token should be in a usable state, but let's do some checks on it.
  if len(auth_token) != config.SECURITY.TOKEN_LENGTH:
    return Response(
      status=400,
      body=f"auth token length invalid. expected {config.SECURITY.TOKEN_LENGTH} but got {len(auth_token)}.",
    )
  if not auth_token.isalnum():
    return Response(
      status=400, body="auth token invalid. must be alphanumeric."
    )

  async with pool.acquire() as conn:
    conn: Connection  # Set the type to Connection.
    key = None
    try:
      key = await Key.get(conn, auth_token)
    except Exception:
      pass  # If it can't find it, no biggie here, but it will throw a
      # ValueError or IndexError on trying to index the Record.
    if key:
      return key  # If we found a key, great! Return it.
    # No key, let's try to find a user.
    user_record = await conn.fetchrow(
      "SELECT * FROM Users WHERE Token=$1 OR Password=$1;", auth_token
    )
    user = None
    try:
      user = User.from_record(user_record)
    except Exception:
      pass  # If it can't find it, no biggie here also.
      # We can just return a 401 response.
    if user:
      return user  # We found a user, return it.
    # Last step, if all else fails, return a Response with a 401.
    return Response(status=401)


async def user_authenticate_secure(request: Request) -> Response | User:
  # Secure makes it password only.
  app: Application = request.app
  pool: Pool = app.pool
  config: Table = app.config

  # We prioritize header authentication over cookie authentication.
  auth_token = request.cookies.get("SecureAuthorization", None)
  if auth_token is None:
    return Response(status=401, body="missing cookie SecureAuthorization")

  # Now the token should be in a usable state, but let's do some checks on it.
  if len(auth_token) != config.SECURITY.TOKEN_LENGTH:
    return Response(
      status=400,
      body=f"auth token length invalid. expected {config.SECURITY.TOKEN_LENGTH} but got {len(auth_token)}.",
    )
  if not auth_token.isalnum():
    return Response(
      status=400, body="auth token invalid. must be alphanumeric."
    )

  async with pool.acquire() as conn:
    conn: Connection  # Set the type to Connection.
    # Let's try to find a user.
    user_record = await conn.fetchrow(
      "SELECT * FROM Users WHERE Password = $1;", auth_token
    )
    try:
      user = await User.from_record(user_record)
    except:
      pass  # If it can't find it, no bigger here also.
      # We can just return a 401 response.
    if user:
      return user  # We found a user, return it.
    # Last step, if all else fails, return a Response with a 401.
    return Response(status=401)


async def user_authenticate(request: Request) -> False | User:
  app: Application = request.app
  pool: Pool = app.pool
  config: Table = app.config

  # We prioritize header authentication over cookie authentication.
  auth_token = request.cookies.get("Authorization", None)
  auth_token = request.headers.get("Authorization", auth_token)

  if auth_token is None:
    return False

  auth_token = auth_token.removeprefix("Bearer ")

  # Now the token should be in a usable state, but let's do some checks on it.
  if len(auth_token) != config.SECURITY.TOKEN_LENGTH:
    return False
  if not auth_token.isalnum():
    return False

  async with pool.acquire() as conn:
    conn: Connection  # Set the type to Connection.
    user_record = await conn.fetchrow(
      "SELECT * FROM Users WHERE Token=$1 OR Password=$1;", auth_token
    )
    user = None
    try:
      user = User.from_record(user_record)
    except:
      pass  # If it can't find it, no biggie here also.
      # We can just return a 401 response.
    if user:
      return user  # We found a user, return it.
    # Last step, if all else fails, return a Response with a 401.
    return False


async def user_authenticate_super_admin(request: Request) -> Response | User:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=401)
  if type(auth) is User:
    if not auth.super_admin:
      return Response(status=401)
    else:
      return auth
