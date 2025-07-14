# Play history

The player.svelte components wrap the youtube-player.component. Both use [media-chrome](https://www.media-chrome.org/) for the UI controls.

```
<Player>
	<YouTubePlayer />
</Player>
```

On the `app_state` table we store player state, see $lib/types for more.
On the `play_history` table we store played tracks. We track the track history! Including reasons why track start and end.

- `src/lib/migrations/06-add_play_history.sql`
- History API functions like `addPlayHistory()` are also in `api.js`.
- The player component at `src/lib/components/player.svelte` calls `playTrack()` with appropriate reasons for user actions.
