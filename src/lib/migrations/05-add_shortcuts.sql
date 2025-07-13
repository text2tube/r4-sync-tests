-- Add user-customizable key bindings to app_state
ALTER TABLE app_state ADD COLUMN IF NOT EXISTS shortcuts JSONB DEFAULT '{
  "Escape": "closePlayerOverlay",
  "$mod+k": "openSearch",
  "k": "togglePlayPause",
  "j": "toggleQueuePanel"
}'::jsonb;