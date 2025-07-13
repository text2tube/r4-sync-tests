import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'
import {syncToBroadcast} from '$lib/api.js'

/** @type {string|null} */
let lastBroadcastingChannelId = null
/** @type {string|null} */
let lastTrackId = null
/** @type {any} */
let broadcastSyncChannel = null

/** @param {string} channelId */
export async function startBroadcasting(channelId) {
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = ${channelId} WHERE id = 1`
	console.log('started broadcasting', {channelId})
}

export async function stopBroadcasting() {
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`
	console.log('stopped broadcasting')
}

/** @param {string} channelId */
export async function joinBroadcast(channelId) {
	try {
		console.log('joining broadcast', {channelId})

		const {data, error} = await sdk.supabase
			.from('broadcast')
			.select('*')
			.eq('channel_id', channelId)
			.single()

		if (error) throw error
		if (!data) throw new Error('Broadcast not found')

		console.log('fetched broadcast', {trackId: data.track_id, playedAt: data.track_played_at})

		const synced = await syncToBroadcast(data)

		if (synced) {
			await pg.sql`UPDATE app_state SET listening_to_channel_id = ${channelId} WHERE id = 1`
			console.log('joined broadcast', {channelId, trackId: data.track_id})
		} else {
			console.log('rejected broadcast sync', {reason: 'track unavailable or too old'})
		}
	} catch (error) {
		console.log('failed joining broadcast', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

export async function leaveBroadcast() {
	await pg.sql`UPDATE app_state SET listening_to_channel_id = NULL WHERE id = 1`
	console.log('left broadcast')
}

export function setupBroadcastSync() {
	pg.live.query('SELECT * FROM app_state WHERE id = 1', [], async (res) => {
		const state = res.rows[0]
		if (!state) return

		const {broadcasting_channel_id, playlist_track} = state

		// Handle broadcast state change (start/stop broadcasting)
		if (broadcasting_channel_id !== lastBroadcastingChannelId) {
			if (broadcasting_channel_id) {
				await createRemoteBroadcast(broadcasting_channel_id, playlist_track)
			} else {
				await deleteRemoteBroadcast(lastBroadcastingChannelId)
			}
			lastBroadcastingChannelId = broadcasting_channel_id
		}

		// Handle track change (only if actively broadcasting)
		if (broadcasting_channel_id && playlist_track !== lastTrackId) {
			await updateRemoteBroadcastTrack(broadcasting_channel_id, playlist_track)
			lastTrackId = playlist_track
		}
	})
}

/**
 * @param {string|null} channelId
 * @param {string|null} trackId
 */
async function createRemoteBroadcast(channelId, trackId) {
	try {
		const {error} = await sdk.supabase.from('broadcast').upsert({
			channel_id: channelId,
			track_id: trackId,
			track_played_at: new Date().toISOString()
		})
		if (error) throw error
		console.log('created remote broadcast', {channelId, trackId})
	} catch (error) {
		console.warn('failed to create remote broadcast', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

/**
 * @param {string|null} channelId
 */
async function deleteRemoteBroadcast(channelId) {
	if (!channelId) return

	try {
		await sdk.supabase.from('broadcast').delete().eq('channel_id', channelId)
		console.log('deleted remote broadcast', {channelId})
	} catch (error) {
		console.warn('failed deleting remote broadcast', {
			channelId,
			error: /** @type {Error} */ (error).message
		})
	}
}

/**
 * @param {string|null} channelId
 * @param {string|null} trackId
 */
async function updateRemoteBroadcastTrack(channelId, trackId) {
	try {
		await sdk.supabase
			.from('broadcast')
			.update({
				track_id: trackId,
				track_played_at: new Date().toISOString()
			})
			.eq('channel_id', channelId)
		console.log('updated remote broadcast track', {channelId, trackId})
	} catch (error) {
		console.log('failed updating remote broadcast track', {
			channelId,
			trackId,
			error: /** @type {Error} */ (error).message
		})
	}
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}
