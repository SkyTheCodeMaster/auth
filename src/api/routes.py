from __future__ import annotations

from typing import TYPE_CHECKING

from aiohttp import web
from aiohttp.web import Response

from utils.authenticate import authenticate
from utils.models.user import User

if TYPE_CHECKING:
  from utils.extra_request import Request


routes = web.RouteTableDef()


@routes.get("/srv/get/")
async def get_srv_get(request: Request) -> Response:
  packet = {
    "frontend_version": request.app.config.pages.frontend_version,
    "api_version": request.app.config.pages.api_version,
  }

  return web.json_response(packet)


@routes.get("/srv/stats/")
async def get_srv_stats(request: Request) -> Response:
  auth = await authenticate(request)

  if not isinstance(auth, User):
    return Response(status=401)

  if not auth.super_admin:
    return Response(status=401)

  database_size_record = await request.conn.fetchrow(
    "SELECT pg_size_pretty ( pg_database_size ( current_database() ) );"
  )
  user_count_record = await request.conn.fetchrow("SELECT COUNT(*) FROM Users;")
  project_count_record = await request.conn.fetchrow(
    "SELECT COUNT(*) FROM Projects;"
  )
  authorization_count_record = await request.conn.fetchrow(
    "SELECT COUNT(*) FROM Authorizations;"
  )
  apikey_count_record = await request.conn.fetchrow(
    "SELECT COUNT(*) FROM APIKeys;"
  )

  packet = {
    "frontend_version": request.app.config.pages.frontend_version,
    "api_version": request.app.config.pages.api_version,
    "dbsize": database_size_record.get("pg_size_pretty"),
    "users": user_count_record.get("count"),
    "projects": project_count_record.get("count"),
    "authorizations": authorization_count_record.get("count"),
    "apikeys": apikey_count_record.get("count"),
  }

  return web.json_response(packet)


@routes.get("/srv/config/")
async def get_srv_config(request: Request) -> Response:
  cfg = request.app.config
  packet = {
    "username": {
      "min": cfg.users.username_min_length,
      "max": cfg.users.username_max_length,
    },
    "password": {
      "min": cfg.users.password_min_length,
      "max": cfg.users.password_max_length,
      "require_mixed_case": cfg.users.password_require_mixed_case,
      "require_number": cfg.users.password_require_number,
      "numbers_required": cfg.users.password_numbers_required,
      "require_special": cfg.users.password_require_special,
      "special_required": cfg.users.password_special_required,
    },
    "production": not cfg.devmode,
  }
  return web.json_response(packet)


async def setup(app: web.Application) -> None:
  for route in routes:
    app.LOG.info(f"  ↳ {route}")
  app.add_routes(routes)
