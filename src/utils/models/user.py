from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from asyncpg import Record

class User:
  name: str
  email: str
  super_admin: bool
  token: str
  password: str
  id: int
  def __init__(self, *,
    name: str = None,
    email: str = None,
    super_admin: bool = None,
    token: str = None,
    password: str = None,
    id: int = None
  ) -> None:
    self.name = name
    self.email = email
    self.super_admin = super_admin
    self.token = token
    self.password = password
    self.id = id

  def dict(self, *, partial: bool = False) -> dict[str,str|bool]:
    out = {
      "name": self.name,
      "super_admin": self.super_admin
    }

    if not partial:
      out["email"] = self.email
      out["token"] = self.token

    return out

  @classmethod
  def from_record(cls, record: Record):
    return cls(
      name = record["username"],
      email = record["email"],
      super_admin = record["superadmin"],
      token = record["token"],
      password = record["password"],
      id = record["id"]
    )