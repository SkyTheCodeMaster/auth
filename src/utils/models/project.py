from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  from asyncpg import Record

class Project:
  id: int
  name: str
  public: bool
  open: bool
  url: str
  def __init__(self, *,
    id: int = None,
    name: str = None,
    public: bool = None,
    open: bool = None,
    url: str = None,
    description: str = None,
    **kwargs
  ) -> None:
    self.id = id
    self.name = name
    self.public = public
    self.open = open
    self.url = url
    self.description = description

  def dict(self) -> dict[str,str|bool]:
    out = {
      "name": self.name,
      "public": self.public,
      "open": self.open,
      "url": self.url,
      "description": self.description
    }

    return out

  @classmethod
  def from_record(cls, record: Record) -> Project:
    return cls(**record)