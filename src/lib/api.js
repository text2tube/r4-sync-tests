import {pg} from '$lib/db'
import {needsUpdate, pullTracks, pullChannel} from '$lib/sync'
import {sdk} from '@radio4000/sdk'
import {leaveBroadcast} from '$lib/broadcast'
import {goto} from '$app/navigation'

/** @typedef {object} User
 * @prop {string} id
 * @prop {string} email
 */

export async function checkUser() {
	try {
		const {data: user, error} = await sdk.users.readUser()
		console.log('checkUser', user, error)
		if (!user) {
			await pg.sql`update app_state set channels = null`
		} else {
			const {data: channels} = await sdk.channels.readUserChannels()
			console.log('checkUser channels', channels)
			if (channels) {
				await pg.sql`update app_state set channels = ${channels.map((/** @type {any} */ c) => c.id)}`
			}
			return user
		}
	} catch (err) {
		console.log('hmm', err)
	}
}

/** @param {string} id */
export async function playTrack(id) {
	await pg.sql`UPDATE app_state SET playlist_track = ${id}`
}

/** @param {import('$lib/types').Channel} channel */
export async function playChannel({id, slug}) {
	// Check if currently listening to a broadcast, and leave it if switching to different channel
	const {rows: appStateRows} =
		await pg.sql`SELECT listening_to_channel_id FROM app_state WHERE id = 1`
	const currentState = appStateRows[0]
	if (currentState?.listening_to_channel_id && currentState.listening_to_channel_id !== id) {
		await leaveBroadcast()
	}

	let tracks = (
		await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`
	).rows

	if (!tracks?.length) {
		await pullTracks(slug)
	}
	tracks = (await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`)
		.rows

	needsUpdate(slug).then((needs) => {
		console.log('needsUpdate', slug, needs)
		if (needs) return pullTracks(slug)
	})

	const ids = tracks.map((t) => t.id)
	return loadPlaylist(ids)
}

/** @param {string} trackId */
export async function ensureTrackAvailable(trackId) {
	try {
		if ((await pg.sql`SELECT 1 FROM tracks WHERE id = ${trackId}`).rows.length > 0) {
			console.log('found track locally', {trackId})
			return true
		}

		console.log('fetching track channel', {trackId})
		const {data} = await sdk.supabase
			.from('channel_track')
			.select('channels(slug)')
			.eq('track_id', trackId)
			.single()

		// @ts-expect-error shut up
		const slug = data?.channels?.slug
		if (!slug) {
			console.log('track channel not found', {trackId})
			return false
		}

		console.log('pulling channel for track', {trackId, slug})
		try {
			if (await needsUpdate(slug)) {
				await pullChannel(slug)
				await pullTracks(slug)
				console.log('pulled channel', {slug})
				return true
			}
		} catch {
			// Channel doesn't exist locally, pull it
			console.log('channel not found locally, pulling', {slug})
			await pullChannel(slug)
			await pullTracks(slug)
			console.log('pulled channel', {slug})
			return true
		}

		console.log('channel already up to date', {slug})
		return false
	} catch (/** @type {any} */ err) {
		console.log('failed ensuring track availability', {trackId, error: err.message})
		return false
	}
}

/** @param {any} broadcast */
export async function syncToBroadcast(broadcast) {
	const {track_id, track_played_at} = broadcast
	const playbackPosition = (Date.now() - new Date(track_played_at).getTime()) / 1000

	console.log('syncing to broadcast', {trackId: track_id, playbackPosition})

	if (playbackPosition < 0 || playbackPosition > 600) {
		console.log('rejected broadcast sync', {reason: 'too old', playbackPosition})
		return false
	}

	if (!(await ensureTrackAvailable(track_id))) {
		console.log('rejected broadcast sync', {reason: 'track unavailable', trackId: track_id})
		return false
	}

	await playTrack(track_id)
	console.log('synced to broadcast', {trackId: track_id})
	return true
}

/** @param {string[]} ids @param {number} index */
async function loadPlaylist(ids, index = 0) {
	console.log('loadPlaylist', ids?.length, ids[index])
	if (!ids || !ids[index]) throw new Error('uhoh loadplaylist missing stuff')
	await pg.sql`
    UPDATE app_state SET
			playlist_tracks = ${ids},
			playlist_track = ${ids[index]}
  `
}

/** @returns {Promise<import('$lib/types').BroadcastWithChannel[]>} */
export async function readBroadcastsWithChannel() {
	const {data, error} = await sdk.supabase.from('broadcast').select(`
		channel_id,
		track_id,
		track_played_at,
		channels (
			id,
			name,
			slug,
			image,
			description
		)
	`)
	if (error) throw error
	// @ts-expect-error shut up
	return data || []
}

// App State Management Functions

/** @param {(state: import('$lib/types').AppState) => void} callback */
export async function subscribeToAppState(callback) {
	return pg.live.query('SELECT * FROM app_state WHERE id = 1', [], (res) => {
		callback(res.rows[0] || {})
	})
}

/** @param {string} trackId */
export async function getTrackWithChannel(trackId) {
	const {rows: trackRows} = await pg.sql`SELECT * FROM tracks WHERE id = ${trackId}`
	const track = trackRows[0]
	if (!track) return null

	const {rows: channelRows} = await pg.sql`SELECT * FROM channels WHERE id = ${track.channel_id}`
	const channel = channelRows[0]
	return {track, channel}
}

/**
 * @param {string} channelId
 * @param {string} searchTerm
 */
export async function searchChannelTracks(channelId, searchTerm = '') {
	const query =
		'SELECT id, title, description, created_at, updated_at FROM tracks WHERE channel_id = $1'
	const {rows} = await pg.query(query, [channelId])

	let filteredTracks = [...rows]

	if (searchTerm.trim()) {
		const search = searchTerm.toLowerCase()
		filteredTracks = filteredTracks.filter((track) => {
			const title = (track.title || '').toLowerCase()
			const description = (track.description || '').toLowerCase()
			return title.includes(search) || description.includes(search)
		})
	}

	return filteredTracks.map((track) => track.id)
}

export async function getChannelsWithTrackCounts() {
	const {rows} = await pg.sql`
		SELECT 
			c.*,
			COUNT(t.id) as track_count
		FROM channels c
		LEFT JOIN tracks t ON c.id = t.channel_id
		GROUP BY c.id
		ORDER BY c.name
	`
	return rows
}

/** @param {string[]} trackIds */
export async function addToPlaylist(trackIds) {
	const {rows} = await pg.sql`SELECT playlist_tracks FROM app_state WHERE id = 1`
	const currentTracks = rows[0]?.playlist_tracks || []
	const newTracks = [...currentTracks, ...trackIds]
	await pg.sql`UPDATE app_state SET playlist_tracks = ${newTracks}`
}

/** @param {string[]} trackIds */
export async function playTracks(trackIds) {
	if (!trackIds?.length) return
	await loadPlaylist(trackIds)
}

// Command palette functions
export async function toggleTheme() {
	const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
	const newTheme = currentTheme === 'light' ? 'dark' : 'light'

	if (newTheme === 'dark') {
		document.documentElement.classList.remove('light')
		document.documentElement.classList.add('dark')
	} else {
		document.documentElement.classList.remove('dark')
		document.documentElement.classList.add('light')
	}
	await pg.sql`update app_state set theme = ${newTheme} where id = 1`.catch(console.warn)
}

export async function toggleQueuePanel() {
	await pg.sql`UPDATE app_state SET queue_panel_visible = NOT queue_panel_visible WHERE id = 1`
}

// Shortcut actions
export function closePlayerOverlay() {
	const playerCheckbox = document.querySelector('input[name="playerLayout"]')
	if (playerCheckbox instanceof HTMLInputElement && playerCheckbox.checked) {
		playerCheckbox.click()
	}
}

export function openSearch() {
	goto('/search').then(() => {
		// Focus the search input after navigation
		setTimeout(() => {
			const searchInput = document.querySelector('input[type="search"]')
			if (searchInput instanceof HTMLInputElement) searchInput.focus()
		}, 0)
	})
}

export function togglePlayPause() {
	const ytPlayer = document.querySelector('youtube-video')
	if (ytPlayer) {
		// YouTube video element has paused property
		if (ytPlayer.paused) {
			ytPlayer.play()
		} else {
			ytPlayer.pause()
		}
	}
}
