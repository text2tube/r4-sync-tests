import {pg} from '$lib/db'

// Global reactive state - no context needed
export const appState = $state({
	id: 1,
	playlist_tracks: [],
	playlist_tracks_shuffled: [],
	playlist_track: undefined,
	is_playing: false,
	theme: 'dark',
	volume: 0.7,
	counter: 0,
	channels_display: 'grid',
	channels: [],
	shuffle: false,
	broadcasting_channel_id: undefined,
	listening_to_channel_id: undefined,
	queue_panel_visible: false,
	show_video_player: true,
	shortcuts: {}
})

let initialized = false

// Initialize from database
export async function initAppState() {
	if (initialized) return

	try {
		const result = await pg.query('SELECT * FROM app_state WHERE id = 1')
		console.log('initAppState', result)
		if (result.rows[0]) {
			Object.assign(appState, result.rows[0])
		}
	} catch (err) {
		console.warn('Failed to load app state from db:', err)
	}
	initialized = true
}

// Persist to database
export async function persistAppState() {
	console.log('persistAppState called')
	if (!initialized) {
		console.log('not initialized')
		return
	}

	try {
		await pg.sql`
			INSERT INTO app_state (id, queue_panel_visible, theme, volume, counter, is_playing, shuffle, show_video_player, channels_display, playlist_track, broadcasting_channel_id, listening_to_channel_id, playlist_tracks, playlist_tracks_shuffled, channels, shortcuts)
			VALUES (${appState.id}, ${appState.queue_panel_visible}, ${appState.theme}, ${appState.volume}, ${appState.counter}, ${appState.is_playing}, ${appState.shuffle}, ${appState.show_video_player}, ${appState.channels_display}, ${appState.playlist_track}, ${appState.broadcasting_channel_id}, ${appState.listening_to_channel_id}, ${appState.playlist_tracks}, ${appState.playlist_tracks_shuffled}, ${appState.channels}, ${JSON.stringify(appState.shortcuts)})
			ON CONFLICT (id) DO UPDATE SET
				queue_panel_visible = EXCLUDED.queue_panel_visible,
				theme = EXCLUDED.theme,
				volume = EXCLUDED.volume,
				counter = EXCLUDED.counter,
				is_playing = EXCLUDED.is_playing,
				shuffle = EXCLUDED.shuffle,
				show_video_player = EXCLUDED.show_video_player,
				channels_display = EXCLUDED.channels_display,
				playlist_track = EXCLUDED.playlist_track,
				broadcasting_channel_id = EXCLUDED.broadcasting_channel_id,
				listening_to_channel_id = EXCLUDED.listening_to_channel_id,
				playlist_tracks = EXCLUDED.playlist_tracks,
				playlist_tracks_shuffled = EXCLUDED.playlist_tracks_shuffled,
				channels = EXCLUDED.channels,
				shortcuts = EXCLUDED.shortcuts
		`
		console.log('persisted app state')
	} catch (err) {
		console.warn('Failed to persist app state:', err)
	}
}
