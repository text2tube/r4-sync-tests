import {pg} from '$lib/db'
import {playTrack} from '$lib/api'
import {shuffleArray} from '$lib/utils'

/** @typedef {import('$lib/types').AppState} AppState */
/** @typedef {import('$lib/types').Track} Track */
/** @typedef {import('$lib/types').Channel} Channel */
/** @typedef {HTMLElement & {paused: boolean, play(): void, pause(): void} | null} YouTubePlayer */

/**
 * @param {YouTubePlayer} yt
 */
export function togglePlay(yt) {
	if (!yt) {
		console.warn('togglePlay: YouTube player not ready')
		return
	}

	if (yt.paused) {
		play(yt)
	} else {
		pause(yt)
	}
}

/** @param {YouTubePlayer} yt */
export function play(yt) {
	if (!yt) {
		console.warn('play: YouTube player not ready')
		return
	}
	yt.play()

	// Don't call play if element isn't properly loaded
	// if (!yt.isLoaded || !yt.api) {
	// 	yt.loadComplete.then(() => {
	// 		setTimeout(() => play(yt), 50)
	// 	})
	// 	return
	// }
	// const playPromise = yt.play()
	// if (playPromise) {
	// 	playPromise.catch(error => {
	// 		console.error('Play failed:', error)
	// 	})
	// }
}

/** @param {YouTubePlayer} yt */
export function pause(yt) {
	if (!yt) {
		console.warn('pause: YouTube player not ready')
		return
	}
	yt.pause()
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function next(track, activeQueue, reason) {
	if (!track?.id) {
		console.warn('next: No current track')
		return
	}
	if (!activeQueue?.length) {
		console.warn('next: No active queue')
		return
	}

	const idx = activeQueue.indexOf(track.id)
	const next = activeQueue[idx + 1]
	if (next) {
		const startReason =
			reason === 'track_completed' || reason === 'youtube_error' ? 'auto_next' : reason
		playTrack(next, reason, startReason)
	} else {
		console.info('next: No next track available')
	}
}

/**
 * @param {Track | undefined} track
 * @param {string[]} activeQueue
 * @param {string} reason
 */
export function previous(track, activeQueue, reason) {
	if (!track?.id) {
		console.warn('previous: No current track')
		return
	}
	if (!activeQueue?.length) {
		console.warn('previous: No active queue')
		return
	}

	const idx = activeQueue.indexOf(track.id)
	const prev = activeQueue[idx - 1]
	if (prev) {
		playTrack(prev, reason, reason)
	} else {
		console.info('previous: No previous track available')
	}
}

/**
 * @param {import('$lib/types').AppState} appState
 * @param {string[]} trackIds
 */
export function toggleShuffle(appState, trackIds) {
	const newShuffleState = !appState.shuffle
	if (newShuffleState) {
		// Turning shuffle ON - generate new shuffle queue
		const shuffledQueue = shuffleArray(trackIds)
		pg.sql`UPDATE app_state SET shuffle = true, playlist_tracks_shuffled = ${shuffledQueue} WHERE id = 1`
	} else {
		// Turning shuffle OFF - clear shuffle queue
		pg.sql`UPDATE app_state SET shuffle = false, playlist_tracks_shuffled = ${[]} WHERE id = 1`
	}
}

export function toggleVideo(appState) {
	pg.sql`UPDATE app_state SET show_video_player = ${!appState.show_video_player}`
}

export function eject() {
	pg.sql`
		UPDATE app_state
		SET
			playlist_track = null,
			playlist_tracks = ${[]},
			playlist_tracks_shuffled = ${[]},
			show_video_player = false,
			shuffle = false,
			is_playing = false
		WHERE id = 1`
}
