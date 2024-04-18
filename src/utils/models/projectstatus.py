from __future__ import annotations

from .project import Project

approval_int_to_word = {
  0: "inactive",
  1: "approved",
  2: "pending",
  3: "denied"
}

class ProjectStatus(Project):
  allowed: int
  def __init__(self, *args, 
    allowed: str = None, 
    **kwargs
  ) -> None:
    self.allowed = allowed
    super().__init__(*args, **kwargs)

  def dict(self) -> dict[str,str|bool|int]:
    out = super().dict()
    out["approval"] = approval_int_to_word.get(self.allowed, "inactive")
    return out