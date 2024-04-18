from __future__ import annotations

from typing import TYPE_CHECKING
from .project import Project
from .user import User

if TYPE_CHECKING:
  from asyncpg import Record, Connection

class Key:
  name: str
  id: str
  data: str
  user: User
  project: Project
  def __init__(self, *,
    name: str = None,
    id: str = None,
    data: str = None,
    user: User = None,
    project: Project = None
  ) -> None:
    self.name = name,
    self.id = id
    self.data = data
    self.user = user
    self.project = project

  def dict(self) -> list[dict[str,str|bool|dict[str,str|bool]]]:
    out = {
      "name": self.name,
      "id": self.id,
      "data": self.data,
      "user": self.user.dict(),
      "project": self.project.dict()
    }

    return out

  @classmethod
  async def get(cls: Key, conn: Connection, id: str) -> Key:
    # A nice and simple query.
    sql_query = """
SELECT
  APIKeys.KeyName,
  APIKeys.KeyID,
  APIKeys.Data as KeyData,
  
  Users.ID as UserID,
  Users.Username as UserName,
  Users.Email as UserEmail,
  Users.Password as UserPass,
  Users.SuperAdmin as UserSuperAdmin,
  Users.Token as UserToken,

  Projects.Name as ProjectName,
  Projects.Open as ProjectOpen,
  Projects.Public as ProjectPublic

FROM APIKeys
JOIN Projects
  ON APIKeys.ProjectID = Projects.ID
JOIN Users
  ON APIKeys.UserID = Users.ID
WHERE
  APIKeys.KeyCode = $1;
"""
    record: Record = await conn.fetchrow(sql_query, id)
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
    key_data: bytes = record["keydata"]
    decoded_data = key_data.decode()

    key = cls(
      name = record["keyname"],
      id = record["keyid"],
      data = decoded_data,
      user = user,
      project = project
    )

    return key