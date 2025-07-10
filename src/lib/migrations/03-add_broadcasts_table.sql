-- Ensure app_state has the essential broadcast fields
ALTER TABLE app_state 
ADD COLUMN IF NOT EXISTS broadcasting_channel_id UUID,
ADD COLUMN IF NOT EXISTS listening_to_channel_id UUID;

-- Add local broadcasts table for local-first reactive UI
CREATE TABLE IF NOT EXISTS broadcasts (
    channel_id UUID PRIMARY KEY,
    track_id UUID NOT NULL,
    track_played_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 
