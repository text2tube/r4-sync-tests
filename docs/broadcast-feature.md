# Broadcast Feature

real-time broadcasting feature for synchronized listening across radio4000 clients

Starting a broadcast updates your local `app_state.broadcasting_channel_id` and syncs to the remote Supabase `broadcast` table. When you join a broadcast, the app fetches the remote broadcast data, ensures the track exists locally (pulling the entire channel if needed), then syncs your player to that track. The `live-broadcasts.svelte` component subscribes to Supabase real-time for broadcast changes and shows active broadcasts in the header.

Broadcasts are stored remotely only - there's no local `broadcasts` table, just `app_state` fields for your own broadcast and listening status. When you change tracks while broadcasting, the remote broadcast row updates automatically. Joining a broadcast requires the track to be available locally, so the app will pull the entire channel if needed. Broadcasts older than 10 minutes are rejected when joining. Each channel can only have one active broadcast at a time since `channel_id` is the primary key in the remote table.

## Files

The core broadcast logic and remote sync lives in `src/lib/broadcast.js`. The UI for starting and stopping broadcasts is in `src/routes/broadcast/+page.svelte`. The header component that shows live broadcasts is `src/lib/components/live-broadcasts.svelte`. Track availability and sync functions are in `src/lib/api.js`.

key functions:
- startBroadcasting/stopBroadcasting - local app_state updates
- joinBroadcast/leaveBroadcast - remote sync and cleanup
- setupBroadcastSync/stopBroadcastSync - reactive sync management
