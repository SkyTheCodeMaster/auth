from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
  pass

class Table(dict):
  def __init__(self, d: dict = None):
    if d:
      for k, v in d.items():
        self.__setattr__(k, v)

  def __getattr__(self, x):
    if isinstance(x, str):
      return self.get(x.lower(), None)
    return self.get(x, None)

  def __getitem__(self, x):
    if isinstance(x, str):
      return self.get(x.lower(), None)
    return self.get(x, None)

  def __setattr__(self, k, v):
    if isinstance(v, dict):
      temp = Table()
      for x, y in v.items():
        temp[x] = y
      if isinstance(k, str):
        self[k.lower()] = temp
      else:
        self[k] = temp
    else:
      if isinstance(k, str):
        self[k.lower()] = v
      else:
        self[k] = v
