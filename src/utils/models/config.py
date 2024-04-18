from __future__ import annotations

import tomllib

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

  def __setitem__(self, k, v) -> None:
    if isinstance(k, str):
      super().__setitem__(k.lower(), v)
    else:
      super().__setitem__(k, v)

  def __contains__(self, k) -> bool:
    if isinstance(k, str):
      return super().__contains__(k.lower())
    else:
      return super().__contains__(k)

with open("config.toml") as f:
  config = Table(tomllib.loads(f.read()))