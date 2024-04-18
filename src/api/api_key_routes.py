from __future__ import annotations

from typing import TYPE_CHECKING

from aiohttp import web
from aiohttp.web import Response

from utils.authenticate import authenticate
from utils.generate_token import generate_token
from utils.models.key import Key
from utils.models.user import User
from utils.validate_parameters import validate_parameters

if TYPE_CHECKING:
  from asyncpg import Pool, Connection

routes = web.RouteTableDef()

@routes.get("/key/{key:.*}/")
async def get_key(request: web.Request) -> Response:
  key_id = request.match_info.get("key", None)
  if key_id is None:
    return Response(status=400,body="must pass key in url")
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=418) # Do we want to allow keys to get other keys?
  if type(auth) is User:
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection
      try:
        key = await Key.get(conn, key_id)
      except: return Response(status=404)
      if key.user.id != auth.id:
        return Response(status=401)
      return web.json_response(key.dict())

@routes.post("/key/create/")
async def post_key_create(request: web.Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    required_parameters = [
      "name",
      "data",
      "project"
    ]
    ok, reason = validate_parameters(request, required_parameters)
    if not ok:
      return Response(body=f"body missing {reason}", status=400)

    body = await request.json()

    # Lets try to find the project
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", body["project"]))["exists"]
      if not project_exists:
        return Response(status=400,body="project not found")
      data: str = body["data"]
      data_encoded: bytes = data.encode()
      name: str = body["name"]

      token = await generate_token(conn, "APIKeys", "KeyID", request.app.config.SECURITY.TOKEN_LENGTH)
      projectid = (await conn.fetchrow("SELECT ID FROM Projects WHERE Name ILIKE $1;", body["project"]))["ID"]

      await conn.execute("""
      INSERT INTO
        APIKeys (UserID, ProjectID, KeyName, KeyID, Data)
      VALUES
        $1, $2, $3, $4, $5;
      """, auth.id, projectid, name, token, data_encoded)

      return Response(body=token)

@routes.patch("/key/edit/")
async def patch_key_edit(request: web.Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    body: dict = await request.json()

    key_id = body.get("id", None)

    if key_id is None:
      return web.Response(status=400,body="must pass id in body")
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection
      try:
        key = await Key.get(conn, key_id)
      except: return Response(status=404, body="key not found")
      if key.user.id != auth.id:
        return Response(status=401)
      name = body.get("name", key.name)
      data = body.get("data", key.data)
      project = body.get("project", key.project.name)

      try:
        project_id = (await conn.fetchrow("SELECT ID FROM Projects WHERE Name ILIKE $1;", project))["ID"]
      except IndexError:
        return Response(status=404, body="project not found")
      if isinstance(data, str):
        data_encoded = data.encode()
      else:
        data_encoded = data

      await conn.execute("""
      UPDATE
        APIKeys
      SET
        KeyName = $2,
        ProjectID = $3,
        Data = $4
      WHERE
        KeyID = $1;
      """, key_id, name, project_id, data_encoded)

      return Response(status=204)

@routes.delete("/key/delete/{key:.*}/")
async def delete_key_delete(request: web.Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    key_id = request.match_info.get("key", None)
    if key_id is None:
      return Response(status=400,body="missing key id")
    # We is all good, check to make sure we own the key and then delete it.
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      try:
        key: Key = Key.get(conn, key_id)
      except:
        return Response(status=404)
      
      if key.user.id != auth.id:
        return Response(status=401)
      
      await conn.execute("""
      DELETE FROM
        APIKeys
      WHERE
        KeyID = $1 AND
        UserID = $2;
      """, key_id, auth.id)

      return Response(status=204)

async def setup(app: web.Application) -> None:
  for route in routes:
    app.LOG.info(f"  ↳ {route}")
  app.add_routes(routes)