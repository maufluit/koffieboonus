-- Eén tabel, alleen datum + soort + pagina + waarde. Geen IP, geen tijdstip, geen bezoekers-id.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dag TEXT NOT NULL,
  t TEXT NOT NULL,
  p TEXT NOT NULL,
  v TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS events_dag ON events (dag);
