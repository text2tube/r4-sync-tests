import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'

/** @param {string} channelId */
export const startBroadcasting = (channelId) =>
	pg.sql`UPDATE app_state SET broadcasting_channel_id = ${channelId} WHERE id = 1`

export const stopBroadcasting = () =>
	pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`

/** @param {string} channelId */
export const joinBroadcast = (channelId) =>
	pg.sql`UPDATE app_state SET listening_to_channel_id = ${channelId} WHERE id = 1`

export const leaveBroadcast = () =>
	pg.sql`UPDATE app_state SET listening_to_channel_id = NULL WHERE id = 1`

/** @type {string|null} */
let lastBroadcastingChannelId = null
/** @type {string|null} */
let lastTrackId = null
/** @type {any} */
let broadcastSyncChannel = null

export function setupBroadcastSync() {
	pg.live.query('SELECT * FROM app_state WHERE id = 1', [], async (res) => {
		const state = res.rows[0]
		const {broadcasting_channel_id, playlist_track} = state

		if (broadcasting_channel_id !== lastBroadcastingChannelId) {
			if (broadcasting_channel_id) {
				try {
					await sdk.supabase.from('broadcast').upsert({
						channel_id: broadcasting_channel_id,
						track_id: playlist_track,
						track_played_at: new Date().toISOString(),
					})
					console.log('🔴 Started broadcasting:', broadcasting_channel_id)
				} catch (error) {
					console.error('Failed to start broadcasting:', error)
				}
			} else {
				if (lastBroadcastingChannelId) {
					try {
						await sdk.supabase.from('broadcast')
							.delete()
							.eq('channel_id', lastBroadcastingChannelId)
						console.log('⭕ Stopped broadcasting:', lastBroadcastingChannelId)
					} catch (error) {
						console.error('Failed to stop broadcasting:', error)
					}
				}
			}
			lastBroadcastingChannelId = broadcasting_channel_id
		}

		if (broadcasting_channel_id && playlist_track !== lastTrackId) {
			try {
				await sdk.supabase.from('broadcast')
					.update({
						track_id: playlist_track,
						track_played_at: new Date().toISOString(),
					})
					.eq('channel_id', broadcasting_channel_id)
				console.log('🎵 Updated broadcast track:', playlist_track)
			} catch (error) {
				console.error('Failed to update broadcast track:', error)
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
