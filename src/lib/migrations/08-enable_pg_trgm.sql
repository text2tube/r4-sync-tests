-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optional: Set similarity threshold (default is 0.3)
-- SELECT set_limit(0.3);