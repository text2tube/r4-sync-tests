import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'
import {playTrack} from '$lib/api'
import {pullTracks, pullChannel} from '$lib/sync'

/**
 * Broadcast service for real-time music streaming using Supabase presence and broadcast
 */

let currentBroadcastRoom = null
let currentListeningRoom = null
let isListening = false

/**
 * Start broadcasting current track to a room
 * @param {string} channelId - The channel ID to broadcast from
 * @param {string} trackId - The current track ID
 */
export async function startBroadcasting(channelId, trackId) {
	if (currentBroadcastRoom) {
		await stopBroadcasting()
	}

	const trackPlayedAt = new Date().toISOString()

	// Create broadcast row in remote Supabase
	const {error} = await sdk.supabase.from('broadcast').upsert({
		channel_id: channelId,
		track_id: trackId,
		track_played_at: trackPlayedAt
	})

	if (error) {
		console.error('Failed to create broadcast row:', error)
		throw error
	}

	const roomName = channelId
	currentBroadcastRoom = sdk.supabase.channel(roomName)

	// Listen for presence changes in the broadcast room
	currentBroadcastRoom.on('presence', {event: 'sync'}, () => {
		const presenceState = currentBroadcastRoom.presenceState()
		const listeners = Object.values(presenceState)
			.flat()
			.filter((user) => user.role === 'listener')
		console.log('Broadcast room sync - listeners:', listeners.length, listeners)
	})

	currentBroadcastRoom.on('presence', {event: 'join'}, ({key, newPresences}) => {
		console.log('Listener joined broadcast:', key, newPresences)
	})

	currentBroadcastRoom.on('presence', {event: 'leave'}, ({key, leftPresences}) => {
		console.log('Listener left broadcast:', key, leftPresences)
	})

	await currentBroadcastRoom.subscribe()

	// Track presence with minimal data
	await currentBroadcastRoom.track({
		track_id: trackId,
		track_played_at: trackPlayedAt,
		channel_id: channelId
	})

	// Update app state
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = ${channelId} WHERE id = 1`

	console.log('Started broadcasting:', {channelId, trackId})
}

/**
 * Stop broadcasting
 */
export async function stopBroadcasting() {
	// Get current broadcasting channel ID to delete the row
	const appStateRes = await pg.sql`SELECT broadcasting_channel_id FROM app_state WHERE id = 1`
	const channelId = appStateRes.rows[0]?.broadcasting_channel_id

	// Update local app state first for immediate UI response
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`

	if (currentBroadcastRoom) {
		await currentBroadcastRoom.untrack()
		await currentBroadcastRoom.unsubscribe()
		currentBroadcastRoom = null
	}

	if (channelId) {
		// Delete broadcast row from remote Supabase (can happen in background)
		const {error} = await sdk.supabase.from('broadcast').delete().eq('channel_id', channelId)

		if (error) {
			console.error('Failed to delete broadcast row:', error)
		}
	}

	console.log('Stopped broadcasting')
}

/**
 * Update broadcast when track changes
 * @param {string} trackId - The new track ID
 */
export async function updateBroadcast(trackId) {
	if (!currentBroadcastRoom) return

	const trackPlayedAt = new Date().toISOString()
	const channelId = currentBroadcastRoom.topic.replace('broadcast-', '')

	// Update broadcast row in remote Supabase
	const {error} = await sdk.supabase
		.from('broadcast')
		.update({
			track_id: trackId,
			track_played_at: trackPlayedAt
		})
		.eq('channel_id', channelId)

	if (error) {
		console.error('Failed to update broadcast row:', error)
	}

	// Update presence
	await currentBroadcastRoom.track({
		track_id: trackId,
		track_played_at: trackPlayedAt,
		channel_id: channelId
	})

	// Send broadcast message for immediate sync
	await currentBroadcastRoom.send({
		type: 'broadcast',
		event: 'track-change',
		payload: {
			track_id: trackId,
			track_played_at: trackPlayedAt
		}
	})

	console.log('Updated broadcast:', {trackId, trackPlayedAt})
}

/**
 * Join someone's broadcast room
 * @param {string} broadcasterChannelId - The broadcaster's channel ID
 */
export async function joinBroadcast(broadcasterChannelId) {
	if (currentListeningRoom) {
		await leaveBroadcast()
	}

	const roomName = broadcasterChannelId
	currentListeningRoom = sdk.supabase.channel(roomName)

	// Listen for track changes
	currentListeningRoom.on('broadcast', {event: 'track-change'}, (payload) => {
		console.log('Received track change:', payload)
		syncToTrack(payload.payload)
	})

	// Listen for presence changes to get current state and track listeners
	currentListeningRoom.on('presence', {event: 'sync'}, () => {
		const presenceState = currentListeningRoom.presenceState()

		// Find broadcaster presence (has track_id)
		const broadcasterPresence = Object.values(presenceState).find((users) =>
			users.some((user) => user.track_id)
		)

		if (broadcasterPresence && broadcasterPresence.length > 0) {
			const currentTrack = broadcasterPresence.find((user) => user.track_id)
			console.log('Syncing to current track:', currentTrack)
			syncToTrack(currentTrack)
		}

		// Log all listeners for debugging
		const listeners = Object.values(presenceState)
			.flat()
			.filter((user) => user.role === 'listener')
		console.log('Current listeners:', listeners.length, listeners)
	})

	// Listen for join/leave events to track listener changes
	currentListeningRoom.on('presence', {event: 'join'}, ({key, newPresences}) => {
		console.log('Someone joined:', key, newPresences)
	})

	currentListeningRoom.on('presence', {event: 'leave'}, ({key, leftPresences}) => {
		console.log('Someone left:', key, leftPresences)
	})

	await currentListeningRoom.subscribe()

	// Track presence as a listener
	const {data: user} = await sdk.users.readUser()
	const userId = user?.id || 'anonymous'

	await currentListeningRoom.track({
		user_id: userId,
		role: 'listener',
		joined_at: new Date().toISOString()
	})
	isListening = true

	// Update app state
	await pg.sql`UPDATE app_state SET listening_to_channel_id = ${broadcasterChannelId} WHERE id = 1`

	// Also get current track directly from broadcast table as fallback
	try {
		const {data: broadcast, error} = await sdk.supabase
			.from('broadcast')
			.select('track_id, track_played_at')
			.eq('channel_id', broadcasterChannelId)
			.single()

		if (broadcast && !error) {
			console.log('Found current broadcast track:', broadcast)
			syncToTrack(broadcast)
		}
	} catch (error) {
		console.log('No current broadcast found for channel:', broadcasterChannelId)
	}

	console.log('Joined broadcast:', broadcasterChannelId)
}

/**
 * Leave current broadcast room
 */
export async function leaveBroadcast() {
	if (currentListeningRoom) {
		await currentListeningRoom.untrack()
		await currentListeningRoom.unsubscribe()
		currentListeningRoom = null
	}

	isListening = false

	// Update app state
	await pg.sql`UPDATE app_state SET listening_to_channel_id = NULL WHERE id = 1`

	console.log('Left broadcast')
}

/**
 * Sync to a track based on when it started
 * @param {object} trackData - Track data with track_id and track_played_at
 */
async function syncToTrack(trackData) {
	if (!isListening) return

	const {track_id, track_played_at} = trackData
	const now = new Date()
	const trackStartTime = new Date(track_played_at)
	const playbackPosition = (now - trackStartTime) / 1000 // seconds

	console.log('Syncing to track:', {track_id, playbackPosition})

	// Only sync if position is reasonable (not too far in the past or future)
	if (playbackPosition >= 0 && playbackPosition < 600) {
		// max 10 minutes
		// Check if track exists locally, if not sync entire channel
		const localTrack = await pg.sql`SELECT * FROM tracks WHERE id = ${track_id}`

		if (localTrack.rows.length === 0) {
			try {
				// Get channel info from channel_track junction table
				const {data: channelTrack, error: ctError} = await sdk.supabase
					.from('channel_track')
					.select('channel_id, channels(slug, name)')
					.eq('track_id', track_id)
					.single()

				if (channelTrack && !ctError && channelTrack.channels) {
					const channel = channelTrack.channels
					console.log('Syncing entire channel:', channel.slug)

					// Pull the channel metadata first (if needed)
					await pullChannel(channel.slug)

					// Pull all tracks for this channel
					await pullTracks(channel.slug)

					console.log('Successfully synced channel:', channel.slug)
				} else {
					console.error('Failed to fetch channel from channel_track table:', ctError)
					return
				}
			} catch (error) {
				console.error('Error syncing channel:', error)
				return
			}
		}

		await playTrack(track_id)

		// TODO: Actually seek to position when YouTube player is ready
		// This would require integration with the YouTube player component
		console.log('Should seek to position:', playbackPosition)
	}
}

/**
 * Get all active broadcasts by checking presence across channels
 * @returns {Promise<Array>} Array of active broadcast info
 */
export async function getActiveBroadcasts() {
	try {
		// Query remote Supabase for active broadcasts
		const {data: broadcasts, error} = await sdk.supabase.from('broadcast').select(`
				channel_id,
				track_id,
				track_played_at,
				channels (
					name,
					slug
				)
			`)

		if (error) {
			console.error('Failed to query broadcasts:', error)
			return []
		}

		// Get listener counts from presence for each broadcast
		const activeBroadcasts = []

		for (const broadcast of broadcasts || []) {
			const roomName = broadcast.channel_id
			const tempChannel = sdk.supabase.channel(roomName)

			// Use a Promise to wait for the presence sync event
			const presencePromise = new Promise((resolve) => {
				tempChannel.on('presence', {event: 'sync'}, () => {
					const presenceState = tempChannel.presenceState()
					const listeners = Object.values(presenceState)
						.flat()
						.filter((user) => user.role === 'listener')

					console.log(`Broadcast ${broadcast.channel_id}: presence state:`, presenceState)
					console.log(
						`Broadcast ${broadcast.channel_id}: found ${listeners.length} listeners:`,
						listeners
					)

					resolve(listeners.length)
				})
			})

			await tempChannel.subscribe()

			// Wait for presence sync or timeout after 2 seconds
			const listenerCount = await Promise.race([
				presencePromise,
				new Promise((resolve) => setTimeout(() => resolve(0), 2000))
			])

			activeBroadcasts.push({
				channel_id: broadcast.channel_id,
				channel_name: broadcast.channels?.name || 'Unknown',
				channel_slug: broadcast.channels?.slug || '',
				track_id: broadcast.track_id,
				track_played_at: broadcast.track_played_at,
				listener_count: listenerCount
			})

			await tempChannel.unsubscribe()
		}

		console.log('Found active broadcasts:', activeBroadcasts)
		return activeBroadcasts
	} catch (error) {
		console.error('Failed to get active broadcasts:', error)
		return []
	}
}

/**
 * Check if currently broadcasting
 * @returns {boolean}
 */
export function isBroadcasting() {
	return currentBroadcastRoom !== null
}

/**
 * Check if currently listening to a broadcast
 * @returns {boolean}
 */
export function isListeningToBroadcast() {
	return isListening
}
