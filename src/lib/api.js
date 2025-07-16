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

/** @param {string} id @param {string|null} [endReason] @param {string|null} [startReason] */
export async function playTrack(id, endReason = null, startReason = null) {
	const {rows} = await pg.sql`SELECT playlist_track FROM app_state WHERE id = 1`
	const track = rows[0]?.playlist_track
	if (!track) throw new Error('missing track to play')
	await pg.sql`UPDATE app_state SET playlist_track = ${id}`
	if (endReason || startReason) {
		await addPlayHistory({
			currentTrack: track,
			newTrack: id,
			endReason,
			startReason
		})
	}
}

/** @param {import('$lib/types').Channel} channel */
export async function playChannel({id, slug}) {
	await leaveBroadcast() // actually only needed if we're listening
	if (await needsUpdate(slug)) await pullTracks(slug)
	const tracks = (
		await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`
	).rows
	await setPlaylist(tracks.map((t) => t.id))
	await playTrack(tracks[0].id, null, 'play_channel')
}

/** @param {string[]} ids */
export async function setPlaylist(ids) {
	await pg.sql`UPDATE app_state SET playlist_tracks = ${ids}`
}

/** @param {import('$lib/types').Broadcast} broadcast */
export async function syncToBroadcast(broadcast) {
	const {track_id, track_played_at} = broadcast
	const playbackPosition = (Date.now() - new Date(track_played_at).getTime()) / 1000

	if (playbackPosition > 600) {
		console.log('ignoring stale broadcast', {playbackPosition, track_id})
		return
	}

	try {
		await playTrack(track_id, null, 'broadcast_sync')
	} catch {
		const {data} = await sdk.supabase
			.from('channel_track')
			.select('channels(slug)')
			.eq('track_id', track_id)
			.single()
		// @ts-expect-error supabase query result structure
		const slug = data?.channels?.slug
		if (slug) {
			await pullChannel(slug)
			await pullTracks(slug)
			await playTrack(track_id, null, 'broadcast_sync')
			await pg.sql`UPDATE app_state SET listening_to_channel_id = ${broadcast.channel_id} WHERE id = 1`
			console.log('synced to broadcast track change', track_id)
			return true
		}
	}
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

/** @param {object} data @param {string|null} data.currentTrack @param {string} data.newTrack @param {string|null} data.endReason @param {string|null} data.startReason */
export async function addPlayHistory({currentTrack, newTrack, endReason, startReason}) {
	// Get current shuffle state
	const {rows} = await pg.sql`SELECT shuffle FROM app_state WHERE id = 1`
	const shuffleState = rows[0]?.shuffle || false

	// End current track if switching tracks
	if (currentTrack && currentTrack !== newTrack && endReason) {
		// Get actual playback time from media controller
		const mediaController = document.querySelector('media-controller#r5')
		const actualPlayTime = mediaController?.getAttribute('mediacurrenttime')
		const msPlayed = actualPlayTime ? Math.round(parseFloat(actualPlayTime) * 1000) : 0

		await pg.sql`
			UPDATE play_history
			SET ended_at = CURRENT_TIMESTAMP,
				ms_played = ${msPlayed},
				reason_end = ${endReason}
			WHERE track_id = ${currentTrack} AND ended_at IS NULL
		`
	}

	// Start new track if reason provided
	if (startReason) {
		await pg.sql`
			INSERT INTO play_history (
				track_id, started_at, ended_at, ms_played,
				reason_start, reason_end, shuffle, skipped
			) VALUES (
				${newTrack}, CURRENT_TIMESTAMP, NULL, 0,
				${startReason}, NULL, ${shuffleState}, FALSE
			)
		`
	}
}
