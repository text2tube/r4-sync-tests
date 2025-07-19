CREATE TABLE track_meta (
  ytid TEXT PRIMARY KEY,
  duration INTEGER,
  -- Provider-specific JSON data
  youtube_data JSONB,
  musicbrainz_data JSONB,
  -- Metadata timestamps
  youtube_updated_at TIMESTAMP,
  musicbrainz_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for JSON queries
CREATE INDEX idx_track_meta_youtube_data ON track_meta USING GIN (youtube_data);
CREATE INDEX idx_track_meta_musicbrainz_data ON track_meta USING GIN (musicbrainz_data);

-- Index for common queries
CREATE INDEX idx_track_meta_ytid ON track_meta (ytid);
