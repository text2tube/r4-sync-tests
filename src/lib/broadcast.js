import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'
import {logger} from '$lib/logger'
import {playTrack} from '$lib/api'
import {pullChannel, pullTracks} from '$lib/sync'

const log = logger.ns('broadcast').seal()

/** @type {string|null} */
let lastBroadcastingChannelId = null
/** @type {string|null} */
let lastTrackId = null
/** @type {any} */
let broadcastSyncChannel = null

/** @param {string} channelId */
export async function startBroadcasting(channelId) {
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = ${channelId} WHERE id = 1`
	log.log('start', {channelId})
}

export async function stopBroadcasting() {
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`
	log.log(':stop')
}

/** @param {string} channelId */
export async function joinBroadcast(channelId) {
	try {
		const {data, error} = await sdk.supabase.from('broadcast').select('*').eq('channel_id', channelId).single()
		if (error) throw error
		await syncPlayBroadcast(data)
		log.log('broadcast:join', {channelId})
	} catch (error) {
		log.error('broadcast:join_error', {
			channelId,
			error: /** @type {Error} */ (error).message,
		})
	}
}

export async function leaveBroadcast() {
	await pg.sql`UPDATE app_state SET listening_to_channel_id = NULL WHERE id = 1`
	log.log('broadcast:leave')
}

/* Watches for changes to app_state.{broadcasting_channel_id,playlist_track},
 * and creates, deletes or updates remote broadcast as needed */
export async function setupBroadcastSync() {
	log.log('setup')
	return pg.live.query('SELECT * FROM app_state WHERE id = 1', [], async (res) => {
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
			track_played_at: new Date().toISOString(),
		})
		if (error) throw error
		log.log('create', {channelId, trackId})
	} catch (error) {
		log.error('create_error', {
			channelId,
			error: /** @type {Error} */ (error).message,
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
		log.log('delete', {channelId})
	} catch (error) {
		log.error('delete_error', {
			channelId,
			error: /** @type {Error} */ (error).message,
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
				track_played_at: new Date().toISOString(),
			})
			.eq('channel_id', channelId)
		log.log('update', {channelId, trackId})
	} catch (error) {
		log.error('update_error', {
			channelId,
			trackId,
			error: /** @type {Error} */ (error).message,
		})
	}
}

export function stopBroadcastSync() {
	if (broadcastSyncChannel) {
		broadcastSyncChannel.unsubscribe()
		broadcastSyncChannel = null
	}
}

/** @param {import('$lib/types').Broadcast} broadcast */
export async function syncPlayBroadcast(broadcast) {
	const {track_id, track_played_at} = broadcast
	const playbackPosition = (Date.now() - new Date(track_played_at).getTime()) / 1000

	if (playbackPosition > 600) {
		log.log('sync_play_broadcast_ignored_stale', {playbackPosition, track_id})
		return
	}

	try {
		await playTrack(track_id, '', 'broadcast_sync')
	} catch {
		const {data} = await sdk.supabase.from('channel_track').select('channels(slug)').eq('track_id', track_id).single()
		// @ts-expect-error supabase
		const slug = data?.channels?.slug
		if (slug) {
			await pullChannel(slug)
			await pullTracks(slug)
			await playTrack(track_id, '', 'broadcast_sync')
			await pg.sql`UPDATE app_state SET listening_to_channel_id = ${broadcast.channel_id} WHERE id = 1`
			log.log('sync_play_broadcast', track_id)
			return true
		}
	}
}
