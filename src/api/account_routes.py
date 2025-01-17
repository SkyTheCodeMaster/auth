from __future__ import annotations

import json
from typing import TYPE_CHECKING

from aiohttp import web
from aiohttp.web import Response

from utils.authenticate import authenticate, get_user, user_authenticate_secure
from utils.generate_token import generate_token_user
from utils.hash import ahash
from utils.models.key import Key
from utils.models.project import Project
from utils.models.projectstatus import ProjectStatus
from utils.models.user import User
from utils.validate_parameters import validate_parameters
from utils.time import time as cookie_time

if TYPE_CHECKING:
  from utils.extra_request import Request

routes = web.RouteTableDef()

def add_cors(request: Request, response: Response) -> None:
  response.headers.add("Access-Control-Allow-Origin",request.headers['Origin'])
  response.headers.add("Access-Control-Allow-Credentials", "true")
  response.headers.add("Access-Control-Allow-Methods","GET")


@routes.options("/user/get/")
async def options_user_get(request: Request) -> Response:
  resp = Response()
  try:
    add_cors(request, resp)
  except Exception:
    pass

  return resp

@routes.get("/user/get/")
async def get_user_get(request: Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400, body="please use /key/{key}/ endpoint")
  if type(auth) is User:
    resp = Response(body=json.dumps(auth.dict()))
    try:
      add_cors(request, resp)
    except Exception:
      pass
    return resp


@routes.get("/user/keys/")
async def get_user_keys(request: Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    # Now we need to go and find all of the user's API keys. Time for a lot of database harassment.
    # This should have a very restrictive ratelimit (10/minute?)
    keys: list[dict[str, str | bool]] = []
    limit = max(1, min(50, request.query.get("limit", 50)))
    offset = max(0, request.query.get("offset", 0))
    key_ids = await request.conn.fetch(
      "SELECT KeyID FROM APIKeys WHERE UserID=$1 LIMIT $2 OFFSET $3;",
      auth.id,
      limit,
      offset,
    )
    for key_id in [record["id"] for record in key_ids]:
      key = await Key.get(request.conn, key_id)
      keys.append(key.dict())
    return web.json_response(keys)


@routes.get("/user/projects/")
async def get_user_projects(request: Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    # Now we need to go and find all of the user's projects. This is done in a single query.
    # This should have a somewhat restrictive ratelimit (60/minute?)
    projects: list[dict[str, str | bool]] = []
    limit = max(1, min(50, request.query.get("limit", 50)))
    offset = max(0, request.query.get("offset", 0))
    project_records = await request.conn.fetch(
      """
      SELECT
        name,
        open,
        public
      FROM
        Authorizations
      JOIN Projects
        ON Authorizations.ProjectID = Projects.ID
      WHERE
        (Authorizations.allowed = 1 AND Authorizations.UserID = $1)
        AND
        Projects.public = true
      LIMIT $2
      OFFSET $3;
      """,
      auth.id,
      limit,
      offset,
    )
    for record in project_records:
      project = Project.from_record(record)
      projects.append(project.dict())
    return web.json_response(projects)


@routes.get("/user/projects/all/")
async def get_user_projects_all(request: Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    # Now we need to go and find all of the user's projects. This is done in a single query.
    # This should have a somewhat restrictive ratelimit (60/minute?)
    projects: list[dict[str, str | bool]] = []
    try:
      u_offset = int(request.query.get("offset", "0"))
    except ValueError:
      return Response(status=400, body="offset must be integer")
    try:
      u_limit = int(request.query.get("limit", "50"))
    except ValueError:
      return Response(status=400, body="limit must be integer")

    limit = max(1, min(50, u_limit))
    offset = max(0, u_offset)
    project_records = await request.conn.fetch(
      """
      SELECT
        allowed,
        name,
        open,
        public,
        userid
      FROM
        Authorizations
      FULL JOIN Projects
        ON Authorizations.ProjectID = Projects.ID
      WHERE
        (Authorizations.allowed != 0 AND Authorizations.UserID = $1)
        OR
        (Projects.public = true AND Authorizations.UserID IS NULL)
      LIMIT $2
      OFFSET $3;
      """,
      auth.id,
      limit,
      offset,
    )
    for record in project_records:
      project = ProjectStatus.from_record(record)
      projects.append(project.dict())
    return web.json_response(projects)


@routes.post("/user/login/")
async def post_user_login(request: Request) -> Response:
  required_parameters = ["name", "password"]
  ok, reason = await validate_parameters(request, required_parameters)
  if not ok:
    return web.Response(body=f"body missing {reason}", status=400)

  body = await request.json()
  hashed_password = await ahash(body["password"], body["name"])

  user_record = await request.conn.fetchrow(
    "SELECT * FROM Users WHERE Username=$1 AND Password=$2;",
    body["name"],
    hashed_password,
  )

  if user_record:
    try:
      user = User.from_record(user_record)
      resp = Response(body=json.dumps(user.dict()))
      resp.set_cookie(
        "Authorization",
        user.token,
        max_age=cookie_time(1, "WEEK" if body.get("rememberme") else "DAY"),
        samesite="none",
        secure=True,
      )
      resp.set_cookie(
        "SecureAuthorization",
        user.password,
        max_age=cookie_time(15, "MINUTE"),
      )
      return resp
    except Exception:
      return Response(status=404)
  else:
    return Response(status=404)


@routes.post("/user/tokenrefresh/")
async def post_user_tokenrefresh(request: Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return Response
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    # Generate new token
    new_token = await generate_token_user(
      request.conn, request.app.config.SECURITY.TOKEN_LENGTH
    )

    await request.conn.execute(
      """
    UPDATE
      Users
    SET
      Token = $3
    WHERE
      Password = $1 AND
      Name = $2;
    """,
      auth.password,
      auth.name,
      new_token,
    )

    return Response(status=204)


@routes.post("/user/create/")
async def post_user_create(request: Request) -> Response:
  required_parameters = ["name", "password", "email", "accepted_tos"]
  ok, reason = await validate_parameters(request, required_parameters)
  if not ok:
    return web.Response(body=f"body missing {reason}", status=400)

  body = await request.json()
  hashed_password = await ahash(body["password"], body["name"])

  token = await generate_token_user(
    request.conn, request.app.config.SECURITY.TOKEN_LENGTH
  )

  await request.conn.execute(
    """
    INSERT INTO
      Users (Username, Email, Password, SuperAdmin, Token)
    VALUES
      ($1, $2, $3, $4, $5)
    """,
    body["name"],
    body["email"],
    hashed_password,
    False,
    token,
  )

  new_user = await get_user(request.conn, token=token)
  return web.json_response(new_user.dict())


@routes.patch("/user/edit/")
async def patch_user_edit(request: Request) -> Response:
  auth = await user_authenticate_secure(request)
  if type(auth) is Response:
    return Response
  if type(auth) is User:
    old_user = auth
    body: dict = await request.json()
    if not ("name" in body ^ "password" in body):
      return Response(status=400, body="must pass 'name' AND 'password'")
    if "name" in body:
      hashed_password = await ahash(body["password"], body["name"])
    else:
      hashed_password = old_user.password
    name = body.get("name", old_user.name)
    email = body.get("email", old_user.email)

    await request.conn.execute(
      """
    UPDATE
      Users
    SET
      Username = $1,
      Email = $2,
      Password = $3
    WHERE
      Token = $4;
    """,
      name,
      email,
      hashed_password,
      old_user.token,
    )

    new_user = await get_user(request.conn, token=old_user.token)
    return web.json_response(new_user.dict())


@routes.delete("/user/delete/")
async def delete_user_delete(request: Request) -> Response:
  auth = await user_authenticate_secure(request)
  if type(auth) is Response:
    return Response
  if type(auth) is User:

    # Wipe from Users
    await request.conn.execute(
      """
    DELETE FROM
      Users
    WHERE
      Username = $1 AND
      Token = $2;
    """,
      auth.name,
      auth.token,
    )
    # Wipe from APIKeys
    await request.conn.execute(
      """
    DELETE FROM
      APIKeys
    WHERE
      UserID = $1;
    """,
      auth.id,
    )
    # Wipe from Authorizations
    await request.conn.execute(
      """
    DELETE FROM
      Authorizations
    WHERE
      UserID = $1;
    """,
      auth.id,
    )

    return Response(status=204)  # Bye


async def setup(app: web.Application) -> None:
  for route in routes:
    app.LOG.info(f"  ↳ {route}")
  app.add_routes(routes)
