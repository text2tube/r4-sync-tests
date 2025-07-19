CREATE TABLE IF NOT EXISTS play_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    ms_played INTEGER DEFAULT 0,
    reason_start TEXT, -- 'user_click', 'user_next', 'user_previous', 'auto_next', 'shuffle_next', 'broadcast_sync', 'playlist_load'
    reason_end TEXT,   -- 'track_completed', 'user_next', 'user_previous', 'user_stop', 'playlist_change', 'youtube_error', 'broadcast_sync'
    shuffle BOOLEAN DEFAULT false,
    skipped BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id);
CREATE INDEX IF NOT EXISTS idx_play_history_started_at ON play_history(started_at DESC);