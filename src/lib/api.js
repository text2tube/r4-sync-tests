import {pg} from '$lib/db'
import {needsUpdate, pullTracks, pullChannel} from '$lib/sync'
import {sdk} from '@radio4000/sdk'

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
	let tracks = (await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`).rows

	if (!tracks?.length) {
		await pullTracks(slug)
	}
	tracks = (await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`).rows

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
		const {data} = await sdk.supabase.from('channel_track').select('channels(slug)').eq('track_id', trackId).single()

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
		} catch (error) {
			// Channel doesn't exist locally, pull it
			console.log('channel not found locally, pulling', {slug})
			await pullChannel(slug)
			await pullTracks(slug)
			console.log('pulled channel', {slug})
			return true
		}

		console.log('channel already up to date', {slug})
		return false
	} catch (error) {
		console.log('failed ensuring track availability', {trackId, error: error.message})
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
	return data || []
}
