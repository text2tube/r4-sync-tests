import {pg} from '$lib/db'
import {playTrack} from '$lib/api'

/**
 * @param {import('$lib/types').AppState} appState
 * @param {import('$lib/types').Track} track
 */
export function togglePlay(appState, track) {
	pg.sql`UPDATE app_state SET is_playing = ${!appState.is_playing}`
}

/**
 * @param {import('$lib/types').Track} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function next(track, activeQueue, reason) {
	if (!track?.id) return
	const idx = activeQueue.indexOf(track.id)
	const next = activeQueue[idx + 1]
	if (next) {
		const startReason =
			reason === 'track_completed' || reason === 'youtube_error' ? 'auto_next' : reason
		playTrack(next, reason, startReason)
	}
}

/**
 * @param {import('$lib/types').Track} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function previous(track, activeQueue, reason) {
	if (!track?.id) return
	const idx = activeQueue.indexOf(track.id)
	const prev = activeQueue[idx - 1]
	if (prev) playTrack(prev, reason, reason)
}

/**
 * @param {import('$lib/types').AppState} appState
 * @param {string[]} trackIds
 * @param {import('$lib/types').Track} track
 */
export function toggleShuffle(appState, trackIds, track) {
	const newShuffleState = !appState.shuffle
	if (newShuffleState) {
		// Turning shuffle ON - generate new shuffle queue
		const shuffledQueue = generateShuffleQueue(trackIds, track)
		pg.sql`UPDATE app_state SET shuffle = true, playlist_tracks_shuffled = ${shuffledQueue} WHERE id = 1`
	} else {
		// Turning shuffle OFF - clear shuffle queue
		pg.sql`UPDATE app_state SET shuffle = false, playlist_tracks_shuffled = ${[]} WHERE id = 1`
	}
}

/**
 * @param {string[]} trackIds
 * @param {import('$lib/types').Track} track
 */
function generateShuffleQueue(trackIds, track) {
	const shuffled = [...trackIds].sort(() => Math.random() - 0.5)
	// If current track exists, put it first in shuffle queue
	if (track?.id && shuffled.includes(track.id)) {
		const filtered = shuffled.filter((id) => id !== track?.id)
		return [track.id, ...filtered]
	}
	return shuffled
}

export function toggleVideo(appState) {
	pg.sql`UPDATE app_state SET show_video_player = ${!appState.show_video_player}`
}

export function eject() {
	pg.sql`UPDATE app_state SET
		playlist_tracks = ${[]},
		playlist_track = null,
		playlist_tracks_shuffled = ${[]},
		show_video_player = false,
		shuffle = false,
		is_playing = false
		WHERE id = 1`
}
