Public Shnaton API responses (shnaton.huji.ac.il, year 2027), captured 2026-10-26; teacher fields and `remark` removed.
- `code-<code>.json`: GET /api/courses/code/<code>?year=2027 (array; [0].id is the course id)
- `groups-<id>.json`: GET /api/courses/groups-with-sessions?year=2027&courseIds=<id> ({id: groups}; with several ids the objects merge)

Each group: `code` ("7-06" = session type 7, group 06), `studySessionTypeName`, `studySessions[]` with `dayOfWeek` (0 = Sunday),
`startTime`/`endTime` (ms after midnight, Israel time), `room.name`, `room.building.name`, and `studySessionSchedules[]`:
one entry per meeting, `date` "YYYY-MM-DDT00:00:00", with per-date `startTime`/`endTime`/`room` overrides (null = the session's).
