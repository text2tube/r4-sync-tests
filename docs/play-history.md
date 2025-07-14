# Play tistory

The player.svelte components wrap the youtube-player.component.

We're using the media-chrome custom element for the player UI.

On the `app_state` table we store player state, see $lib/types for more.

Every track play is logged locally in the `play_history` table with timestamps, duration, and reasons for starting/ending. The history tracks (pun intended) how users play their tracks - whether buttons were clicked, auto advance etc.

For example, a track might have ended because the user pressed next, or because the track is missing (YouTube error). The play_history reveals this.

- `src/lib/migrations/06-add_play_history.sql` 
- History API functions like `getPlayHistory()` and `addPlayHistory()` are also in `api.js`. 
- The player component at `src/lib/components/player.svelte` calls `playTrack()` with appropriate reasons for user actions.

## Confusing parts

The same reason parameter means different things for ending vs starting tracks - `next('user_next')` sets `reason_end = 'user_next'` for the previous track and `reason_start = 'user_next'` for the new track. But `next('track_completed')` sets `reason_end = 'track_completed'` for the previous track and `reason_start = 'auto_next'` for the new one, since the app auto-advanced. This mapping ensures start reasons reflect the actual trigger mechanism rather than just copying end reasons.
