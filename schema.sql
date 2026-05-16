-- Schema for Pips Worker D1 Database
CREATE TABLE IF NOT EXISTS pips (
    date TEXT PRIMARY KEY,
    data TEXT,
    editor TEXT,
    constructors TEXT,
    explanation TEXT
);
-- Index for faster search
CREATE INDEX IF NOT EXISTS idx_pips_editor ON pips(editor);
CREATE INDEX IF NOT EXISTS idx_pips_constructors ON pips(constructors);
