import {sdk} from '@radio4000/sdk'
import {pg} from '$lib/db'
import {playTrack} from '$lib/api'

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

	const roomName = `broadcast-${channelId}`
	currentBroadcastRoom = sdk.supabase.channel(roomName)

	// Track presence with minimal data
	await currentBroadcastRoom.track({
		track_id: trackId,
		track_started_at: new Date().toISOString(),
		channel_id: channelId
	})

	await currentBroadcastRoom.subscribe()
	
	// Update app state
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = ${channelId} WHERE id = 1`
	
	console.log('Started broadcasting:', {channelId, trackId})
}

/**
 * Stop broadcasting
 */
export async function stopBroadcasting() {
	if (currentBroadcastRoom) {
		await currentBroadcastRoom.untrack()
		await currentBroadcastRoom.unsubscribe()
		currentBroadcastRoom = null
	}
	
	// Update app state
	await pg.sql`UPDATE app_state SET broadcasting_channel_id = NULL WHERE id = 1`
	
	console.log('Stopped broadcasting')
}

/**
 * Update broadcast when track changes
 * @param {string} trackId - The new track ID
 */
export async function updateBroadcast(trackId) {
	if (!currentBroadcastRoom) return

	const trackStartedAt = new Date().toISOString()
	
	// Update presence
	await currentBroadcastRoom.track({
		track_id: trackId,
		track_started_at: trackStartedAt,
		channel_id: currentBroadcastRoom.topic.replace('broadcast-', '')
	})

	// Send broadcast message for immediate sync
	await currentBroadcastRoom.send({
		type: 'broadcast',
		event: 'track-change',
		payload: {
			track_id: trackId,
			track_started_at: trackStartedAt
		}
	})
	
	console.log('Updated broadcast:', {trackId, trackStartedAt})
}

/**
 * Join someone's broadcast room
 * @param {string} broadcasterChannelId - The broadcaster's channel ID
 */
export async function joinBroadcast(broadcasterChannelId) {
	if (currentListeningRoom) {
		await leaveBroadcast()
	}

	const roomName = `broadcast-${broadcasterChannelId}`
	currentListeningRoom = sdk.supabase.channel(roomName)

	// Track presence as a listener
	const {data: user} = await sdk.users.readUser()
	const userId = user?.id || 'anonymous'
	
	await currentListeningRoom.track({
		user_id: userId,
		role: 'listener',
		joined_at: new Date().toISOString()
	})

	// Listen for track changes
	currentListeningRoom.on('broadcast', {event: 'track-change'}, (payload) => {
		console.log('Received track change:', payload)
		syncToTrack(payload.payload)
	})

	// Listen for presence changes to get current state and track listeners
	currentListeningRoom.on('presence', {event: 'sync'}, () => {
		const presenceState = currentListeningRoom.presenceState()
		
		// Find broadcaster presence (has track_id)
		const broadcasterPresence = Object.values(presenceState).find(users => 
			users.some(user => user.track_id)
		)
		
		if (broadcasterPresence && broadcasterPresence.length > 0) {
			const currentTrack = broadcasterPresence.find(user => user.track_id)
			console.log('Syncing to current track:', currentTrack)
			syncToTrack(currentTrack)
		}
		
		// Log all listeners for debugging
		const listeners = Object.values(presenceState).flat().filter(user => user.role === 'listener')
		console.log('Current listeners:', listeners.length, listeners)
	})

	await currentListeningRoom.subscribe()
	isListening = true
	
	// Update app state
	await pg.sql`UPDATE app_state SET listening_to_channel_id = ${broadcasterChannelId} WHERE id = 1`
	
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
 * @param {object} trackData - Track data with track_id and track_started_at
 */
async function syncToTrack(trackData) {
	if (!isListening) return

	const {track_id, track_started_at} = trackData
	const now = new Date()
	const trackStartTime = new Date(track_started_at)
	const playbackPosition = (now - trackStartTime) / 1000 // seconds

	console.log('Syncing to track:', {track_id, playbackPosition})

	// Only sync if position is reasonable (not too far in the past or future)
	if (playbackPosition >= 0 && playbackPosition < 600) { // max 10 minutes
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
		// Get all channels from local db to check for broadcasts
		const channelsResult = await pg.sql`SELECT id, name, slug FROM channels LIMIT 50`
		const channels = channelsResult.rows
		
		const activeBroadcasts = []
		
		// Check each channel for active broadcasts
		for (const channel of channels) {
			const roomName = `broadcast-${channel.id}`
			const tempChannel = sdk.supabase.channel(roomName)
			
			await tempChannel.subscribe()
			
			// Check presence state
			const presenceState = tempChannel.presenceState()
			const broadcasterPresence = Object.values(presenceState).find(users => 
				users.some(user => user.track_id)
			)
			
			if (broadcasterPresence && broadcasterPresence.length > 0) {
				const broadcaster = broadcasterPresence.find(user => user.track_id)
				const listeners = Object.values(presenceState).flat().filter(user => user.role === 'listener')
				
				activeBroadcasts.push({
					channel_id: channel.id,
					channel_name: channel.name,
					channel_slug: channel.slug,
					track_id: broadcaster.track_id,
					track_started_at: broadcaster.track_started_at,
					listener_count: listeners.length
				})
			}
			
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