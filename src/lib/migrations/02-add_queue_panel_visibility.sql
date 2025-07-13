-- Add queue panel visibility to app_state
ALTER TABLE app_state ADD COLUMN IF NOT EXISTS queue_panel_visible BOOLEAN DEFAULT false;