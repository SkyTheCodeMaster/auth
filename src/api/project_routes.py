from __future__ import annotations

from typing import TYPE_CHECKING

from aiohttp import web
from aiohttp.web import Response
from asyncpg import UniqueViolationError

from utils.authenticate import authenticate, user_authenticate_super_admin, user_authenticate
from utils.get_project_user_count import get_project_user_count
from utils.models.key import Key
from utils.models.project import Project
from utils.models.projectstatus import ProjectStatus
from utils.models.user import User
from utils.validate_parameters import validate_parameters

if TYPE_CHECKING:
  from asyncpg import Connection, Pool, Record

routes = web.RouteTableDef()

@routes.get("/project/search/")
async def get_project_search(request: web.Request) -> Response:
  query = request.query
  project_name = query.get("q", "")

  try:
    u_offset = int(query.get("offset", "0"))
  except ValueError:
    return Response(status=400,body="offset must be integer")
  try:
    u_limit = int(query.get("limit", "50"))
  except ValueError:
    return Response(status=400,body="limit must be integer")

  limit = max(1, min(50, u_limit))
  offset = max(0, u_offset)

  pool: Pool = request.app.pool
  async with pool.acquire() as conn:
    conn: Connection

    records = await conn.fetch("""
    SELECT
      *
    FROM
      Projects
    WHERE
      Public = true AND
      Name ILIKE $1
    LIMIT $2
    OFFSET $3;
    """, f"%{project_name}%", limit, offset)

    projects: list[dict[str,str|bool]] = []
    for record in records:
      project = Project.from_record(record)
      projects.append(project.dict())

    return web.json_response(projects)

@routes.get("/project/details/{project_name:.*}/")
async def get_project_details(request: web.Request) -> Response:
  project_name = request.match_info.get("project_name", None)
  if project_name is None:
    return Response(status=404)

  PUBLIC_QUERY = """
    SELECT * FROM Projects WHERE Name = $1 AND Public = true;
  """
  public = True

  auth = await user_authenticate(request)
  if not auth:
    public = True
    query = PUBLIC_QUERY
  else:
    public = False
    query = """
      SELECT
        Projects.ID,
        Projects.Name,
        Projects.Open,
        Projects.Public,
        Projects.URL
      FROM
        Authorizations
      JOIN
        Projects
      ON 
        Authorizations.ProjectID = Projects.ID
      WHERE
        (
          Authorizations.UserID = $2 AND 
          Authorizations.Allowed = 1 AND 
          Projects.Name = $1
        )
        OR
        (
          Projects.Open = true AND 
          Projects.Name = $1
        );
    """

  pool: Pool = request.app.pool
  async with pool.acquire() as conn:
    conn: Connection

    if not auth:
      record = await conn.fetchrow(query, project_name)
    else:
      record = await conn.fetchrow(query, project_name, auth.id)
    if not record and not public:
      # Try the public query
      record = await conn.fetchrow(PUBLIC_QUERY, project_name)

    # Else, return 404
    if not record:
      return Response(status=404)

    project = Project.from_record(record)
    user_count = await get_project_user_count(project.id, conn)

    data = project.dict()
    data["user_count"] = user_count

    return web.json_response(data)

@routes.post("/project/enroll/")
async def post_project_enroll(request: web.Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    body = await request.json()

    project_name = body.get("name", None)

    if project_name is None:
      return Response(status=400,body="missing name field")
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1 AND Public = true);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      project_record = await conn.fetchrow("SELECT * FROM Projects WHERE Name ILIKE $1;", project_name)
      project = Project.from_record(project_record)

      auth_record = await conn.fetchrow("SELECT Allowed FROM Authorizations WHERE ProjectID = $1 AND UserID = $2;", project.id, auth.id)
      if auth_record is None:
        status = 0
      else:
        status = auth_record.get("allowed", 0)

      if status == 0:
        # Default. If project is open, approve, if not, set to 2.
        if project.open:
          await conn.execute("""
          INSERT INTO 
            Authorizations (Allowed, ProjectID, UserID)
          VALUES
            ($1, $2, $3)
          ON CONFLICT (UserID, ProjectID)
            DO UPDATE SET
              Allowed = $1;
          """, 1,  project.id, auth.id)
          return Response(status=204)
        else:
          await conn.execute("""
          INSERT INTO 
            Authorizations (Allowed, ProjectID, UserID)
          VALUES
            ($1, $2, $3)
          ON CONFLICT (UserID, ProjectID)
            DO UPDATE SET
              Allowed = $1;
          """, 2, project.id, auth.id)
          return Response(status=202)
      elif status == 1:
        return Response(status=400)
      elif status == 2:
        return Response(status=204)
      elif status == 3:
        return Response(status=403)

@routes.get("/project/status/{project_name:.*}/")
async def get_project_status(request: web.Request) -> Response:
  auth = await authenticate(request)
  if type(auth) is Response:
    return auth
  if type(auth) is Key:
    return Response(status=400)
  if type(auth) is User:
    project_name = request.match_info.get("project_name", None)
    if project_name is None:
      return Response(status=404)
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      project_record = await conn.fetchrow("""
      SELECT 
        Projects.ID, 
        Projects.Name, 
        Projects.Open,
        Projects.Url,
        Projects.Description,
        Projects.Public, 
        Authorizations.Allowed 
      FROM
        Projects
      JOIN Authorizations
      ON Authorizations.ProjectID = Projects.ID 
      WHERE 
        Projects.Name ILIKE $1 AND
        Authorizations.UserID = $2;
      """, project_name, auth.id)

      data = None
      if not project_record:
        project_record = await conn.fetchrow("SELECT * FROM Projects WHERE Name ILIKE $1 AND Public=true;", project_name)
        print("using public record", project_record)
        project = Project.from_record(project_record)
        data = project.dict()
        data["approval"] = "inactive"
      else:
        print("used private", project_record)
        project_status = ProjectStatus(**project_record)
        data = project_status.dict()
      print(data)
      return web.json_response(data)

@routes.post("/project/create/")
async def post_project_create(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:
    required_parameters = ["name","public","open"]
    ok, reason = await validate_parameters(request, required_parameters)
    if not ok:
      return Response(body=f"body missing {reason}", status=400)

    body = await request.json()

    project_name = body.get("name", None)
    if project_name is None:
      return Response(status=404)
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      name = body.get("name")
      open = body.get("open").lower() == "true"
      public = body.get("public").lower() == "true"

      try:
        await conn.execute("""
        INSERT INTO
          Projects (Name, Open, Public)
        VALUES
          ($1,$2,$3);
        """, name, open, public)
      except UniqueViolationError:
        return Response(status=400,body="project already exists")
      return Response(status=204)

@routes.patch("/project/edit/{project_name:.*}/")
async def patch_project_edit(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:
    project_name = request.match_info.get("project_name", None)
    if project_name is None:
      return Response(status=404)
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      project_record = await conn.fetchrow("""
      SELECT 
        *
      FROM
        Projects
      WHERE 
        Projects.Name ILIKE $1;
      """, project_name, auth.id)

      body = await request.json()
      name = body.get("name",project_record.get("name"))
      open = str(body.get("open",project_record.get("open"))).lower() == "true"
      public = str(body.get("public",project_record.get("public"))).lower() == "true"

      await conn.execute("""
      UPDATE
        Projects
      SET
        Name = $2,
        Open = $3,
        Public = $4
      WHERE
        Name ILIKE $1;
      """, project_record.get("name"), name, open, public)

      return Response(status=204)

@routes.delete("/project/edit/{project_name:.*}/")
async def delete_project_delete(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:
    project_name = request.match_info.get("project_name", None)
    if project_name is None:
      return Response(status=404)

    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")
      await conn.execute("""
      DELETE FROM
        Projects
      WHERE
        Name ILIKE $1;
      """)
      
      return Response(status=204)

@routes.get("/project/getpending/{project_name:.*}/")
async def get_project_getpending(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:
    project_name = request.match_info.get("project_name", None)
    if project_name is None:
      return Response(status=404)
    query = request.query

    try:
      u_offset = int(query.get("offset", "0"))
    except ValueError:
      return Response(status=400,body="offset must be integer")
    try:
      u_limit = int(query.get("limit", "50"))
    except ValueError:
      return Response(status=400,body="limit must be integer")

    limit = max(1, min(50, u_limit))
    offset = max(0, u_offset)
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      authorization_records = await conn.fetch("""
      SELECT
        Users.ID as UserID,
        Users.Username as Username,
        Users.Email as UserEmail,
        Users.Password as UserPass,
        Users.SuperAdmin as UserSuperAdmin,
        Users.Token as UserToken,

        Projects.Name as ProjectName,
        Projects.Open as ProjectOpen,
        Projects.Public as ProjectPublic
      
      FROM Authorizations
      JOIN Projects
        ON Authorizations.ProjectID = Projects.ID
      JOIN Users
        ON Authorizations.UserID = Users.ID
      WHERE
        Authorizations.Allowed = 2
      LIMIT $1
      OFFSET $2;
      """, limit, offset)

      authorization_requests: list[dict[str,dict[str,str|bool]]] = []

      for record in authorization_records:
        record: Record
        project = Project(
          name = record["projectname"],
          public = record["projectpublic"],
          open = record["projectopen"]
        )
        user = User(
          name = record["username"],
          email = record["useremail"],
          super_admin = record["usersuperadmin"],
          token = record["usertoken"],
          password = record["userpass"],
          id = record["userid"]
        )

        authorization_request: dict[str,dict[str,str|bool]] = {
          "user": user.dict(),
          "project": project.dict()
        }

        authorization_requests.append(authorization_request)

      return web.json_response(authorization_requests)

@routes.post("/projects/approve/")
async def post_projects_approve(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:

    required_parameters = ["user","project","approved"]
    ok, reason = await validate_parameters(request, required_parameters)
    if not ok:
      return Response(body=f"body missing {reason}", status=400)

    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      body = await request.json()
      allowed = 1 if body.get("approved").lower() == "true" else 3 

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", body.get("project")))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      user_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Users WHERE Username ILIKE $1);", body.get("user")))["exists"]
      if not user_exists:
        return Response(status=400,body="user does not exist")  

      user_record = await conn.fetchrow("SELECT * FROM Users WHERE Username ILIKE $1;", body.get("user"))
      project_record = await conn.fetchrow("SELECT * FROM Projects WHERE Name ILIKE $1;", body.get("project"))
      user = User.from_record(user_record)
      project = Project.from_record(project_record)

      await conn.execute("""
      INSERT INTO
        Authorizations (UserID, ProjectID, Allowed)
      VALUES
        ($1,$2,$3)
      ON CONFLICT (UserID, ProjectID)
        DO UPDATE SET
          Allowed = $3;
      """, user.id, project.id, allowed)

      return Response(status=204)

@routes.get("/project/getusers/{project_name:.*}/")
async def get_project_getusers(request: web.Request) -> Response:
  auth = await user_authenticate_super_admin(request)
  if type(auth) is Response:
    return auth
  if type(auth) is User:
    project_name = request.match_info.get("project_name", None)
    if project_name is None:
      return Response(status=404)
    query = request.query

    try:
      u_offset = int(query.get("offset", "0"))
    except ValueError:
      return Response(status=400,body="offset must be integer")
    try:
      u_limit = int(query.get("limit", "50"))
    except ValueError:
      return Response(status=400,body="limit must be integer")

    limit = max(1, min(50, u_limit))
    offset = max(0, u_offset)
    
    pool: Pool = request.app.pool
    async with pool.acquire() as conn:
      conn: Connection

      project_exists = (await conn.fetchrow("SELECT EXISTS (SELECT 1 FROM Projects WHERE Name ILIKE $1);", project_name))["exists"]
      if not project_exists:
        return Response(status=400,body="project does not exist")

      project_record = await conn.fetchrow("SELECT * FROM Projects WHERE Name ILIKE $1;", project_name)
      project = Project.from_record(project_record)

      authorization_records = await conn.fetch("""
      SELECT
        Users.Username,
        Users.SuperAdmin,

        Authorizations.Allowed
      
      FROM Authorizations
      JOIN Projects
        ON Authorizations.ProjectID = Projects.ID
      JOIN Users
        ON Authorizations.UserID = Users.ID
      WHERE
        Projects.ID = $1
      LIMIT $2
      OFFSET $3;
      """, project.id, limit, offset)

      project_users: dict[str,str|bool|list[dict[str,str|dict[str,str|bool]]]] = {}
      users: list[dict[str,str|bool]] = []
      for record in authorization_records:
        record: Record
        user = User(
          name = record["username"],
          super_admin = record["superadmin"],
        )

        users.append(user.dict())

      project_users = project.dict()
      project_users["users"] = users

      return web.json_response(project_users)

async def setup(app: web.Application) -> None:
  for route in routes:
    app.LOG.info(f"  ↳ {route}")
  app.add_routes(routes)