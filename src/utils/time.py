from __future__ import annotations
# A helper function to make cookie max_age

from .models.config import Table

times = Table()
# Fill out the times
times["SECOND"] = 1  # Base unit of time.
times["MINUTE"] = times["SECOND"] * 60  # 60 seconds.
times["HOUR"] = times["MINUTE"] * 60  # 60 minutes.
times["DAY"] = times["HOUR"] * 24  # 24 hours.
times["WEEK"] = times["DAY"] * 7  # 7 days.
times["MONTH"] = times["DAY"] * 31  # 31 days.
times["YEAR"] = times["DAY"] * 365  # 365 days.
times["BIENNIUM"] = (
  times["YEAR"] * 2
)  # 2 years. https://www.smartick.com/blog/mathematics/measurements-and-data/measurements-time-century/
times["LUSTRUM"] = times["YEAR"] * 5  # 5 years. ^^^
times["DECADE"] = times["YEAR"] * 10  # 10 years.
times["CENTURY"] = times["YEAR"] * 100  # 100 years.
times["MILLENIUM"] = times["YEAR"] * 1000  # 1000 years.
times["KILOANNUM"] = times["YEAR"] * 1000  # SI prefix 'kilo'
times["EPOCH"] = times["YEAR"] * 1_000_000  # 1 million years.
times["MEGAANNUM"] = times["YEAR"] * 1_000_000  # SI prefix 'mega'.
times["AEON"] = times["YEAR"] * 1_000_000_000  # 1 billion years.


def time(num: float | int, unit: str) -> float | int:
  if unit not in times:
    raise ValueError(f"{unit} is not present in times table!")
  return num * times[unit]
