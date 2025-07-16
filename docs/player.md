# Player

The player.svelte components wrap the youtube-player.component. Both use [media-chrome](https://www.media-chrome.org/) for the UI controls.

```
<Player>
	<YouTubePlayer />
</Player>
```

The `app_state` table stores all application state, including the player, see $lib/types.
The `play_history` table store played tracks. We track the tracks, including reasons why track start and end.

The player.svelte reacts to changes to the app_state table and plays accordingly.
