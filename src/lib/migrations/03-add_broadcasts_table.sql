-- Ensure app_state has the essential broadcast fields
ALTER TABLE app_state 
ADD COLUMN IF NOT EXISTS broadcasting_channel_id UUID,
ADD COLUMN IF NOT EXISTS listening_to_channel_id UUID; 

