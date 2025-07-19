-- Create function to extract YouTube ID from URL
CREATE OR REPLACE FUNCTION ytid(url TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            -- youtube.com/watch?v=ID or youtube.com/embed/ID
            (regexp_match(url, 'youtube\.com/(?:.*[?&]v=|embed/)([a-zA-Z0-9_-]{6,11})'))[1],
            -- youtu.be/ID
            (regexp_match(url, 'youtu\.be/([a-zA-Z0-9_-]{6,11})'))[1]
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view that joins tracks with their metadata
CREATE VIEW tracks_with_meta AS
SELECT 
  t.*
  -- Metadata from track_meta table
  tm.duration,
  tm.youtube_data,
  tm.musicbrainz_data,
  tm.youtube_updated_at,
  tm.musicbrainz_updated_at
FROM tracks t
LEFT JOIN track_meta tm ON tm.ytid = ytid(t.url);
