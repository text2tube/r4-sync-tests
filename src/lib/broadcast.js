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
		const {broadcasting_channel_id, playlist_track} = state

		if (broadcasting_channel_id !== lastBroadcastingChannelId) {
			if (broadcasting_channel_id) {
				try {
					const {error} = await sdk.supabase.from('broadcast').upsert({
						channel_id: broadcasting_channel_id,
						track_id: playlist_track,
						track_played_at: new Date().toISOString()
					})
					if (error) throw error
					console.log('created remote broadcast', {
						channelId: broadcasting_channel_id,
						trackId: playlist_track
					})
				} catch (error) {
					console.warn('failed to create remote broadcast', {
						channelId: broadcasting_channel_id,
						error: /** @type {Error} */ (error).message
					})
				}
			} else {
				if (lastBroadcastingChannelId) {
					try {
						await sdk.supabase
							.from('broadcast')
							.delete()
							.eq('channel_id', lastBroadcastingChannelId)
						console.log('deleted remote broadcast', {channelId: lastBroadcastingChannelId})
					} catch (error) {
						console.warn('failed deleting remote broadcast', {
							channelId: lastBroadcastingChannelId,
							error: /** @type {Error} */ (error).message
						})
					}
				}
			}
			lastBroadcastingChannelId = broadcasting_channel_id
		}

		if (broadcasting_channel_id && playlist_track !== lastTrackId) {
			try {
				await sdk.supabase
					.from('broadcast')
					.update({
						track_id: playlist_track,
						track_played_at: new Date().toISOString()
					})
					.eq('channel_id', broadcasting_channel_id)
				console.log('updated remote broadcast track', {
					channelId: broadcasting_channel_id,
					trackId: playlist_track
				})
			} catch (error) {
				console.log('failed updating remote broadcast track', {
					channelId: broadcasting_channel_id,
					trackId: playlist_track,
					error: /** @type {Error} */ (error).message
				})
			}
			lastTrackId = playlist_track
		}
	})
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}
