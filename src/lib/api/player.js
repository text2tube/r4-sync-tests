import {pg} from '$lib/db'
import {playTrack} from '$lib/api'

/** @param {import('$lib/types').AppState} appState */
export function togglePlay(appState, yt) {
	if (appState.is_playing) {
		pause(yt)
	} else {
		play(yt)
	}
}

function play(yt) {
	yt.play()
	pg.query('UPDATE app_state SET is_playing = true')
}

function pause(yt) {
	yt.pause()
	pg.query('UPDATE app_state SET is_playing = false')
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
 */
export function toggleShuffle(appState, trackIds) {
	const newShuffleState = !appState.shuffle
	if (newShuffleState) {
		// Turning shuffle ON - generate new shuffle queue
		const shuffledQueue = generateShuffleQueue(trackIds)
		pg.sql`UPDATE app_state SET shuffle = true, playlist_tracks_shuffled = ${shuffledQueue} WHERE id = 1`
	} else {
		// Turning shuffle OFF - clear shuffle queue
		pg.sql`UPDATE app_state SET shuffle = false, playlist_tracks_shuffled = ${[]} WHERE id = 1`
	}
}

/** @param {string[]} trackIds */
function generateShuffleQueue(trackIds) {
	return [...trackIds].sort(() => Math.random() - 0.5)
}

export function toggleVideo(appState) {
	pg.sql`UPDATE app_state SET show_video_player = ${!appState.show_video_player}`
}

export function eject() {
	pg.sql`
		UPDATE app_state
		SET
			playlist_tracks = ${[]},
			playlist_track = null,
			playlist_tracks_shuffled = ${[]},
			show_video_player = false,
			shuffle = false,
			is_playing = false
		WHERE id = 1`
}
