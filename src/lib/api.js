import {pg} from '$lib/db'
import {needsUpdate, pullTracks} from '$lib/sync'
import {sdk} from '@radio4000/sdk'
import {updateBroadcast, isBroadcasting} from '$lib/services/broadcast'

/** @typedef {object} User
 * @prop {string} id
 * @prop {string} email
 *

/** Returns a user */
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
				await pg.sql`update app_state set channels = ${channels.map((c) => c.id)}`
			}
			return user
		}
	} catch (err) {
		console.log('hmm', err)
	}
}

/**
 * @param {string} id
 */
export async function playTrack(id) {
	// @todo check if we need to switch playlist_tracks (different channel)
	console.log('playTrack', id)
	
	// Update the app state
	await pg.sql`UPDATE app_state SET playlist_track = ${id}`
	
	// Update broadcast if currently broadcasting
	if (isBroadcasting()) {
		try {
			await updateBroadcast(id)
		} catch (error) {
			console.error('Failed to update broadcast:', error)
		}
	}
}

/**
 * Just play the channel already. Wait, what does playing a channel even mean? Who am i?
 * @param {import('$lib/types').Channel} channel
 */
export async function playChannel({id, slug}) {
	let tracks = (
		await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`
	).rows

	// get tracks if needed
	if (!tracks?.length) {
		await pullTracks(slug)
	}
	tracks = (await pg.sql`select * from tracks where channel_id = ${id} order by created_at desc`)
		.rows

	// Pull in background to be sure
	needsUpdate(slug).then((needs) => {
		console.log('needsUpdate', slug, needs)
		if (needs) return pullTracks(slug)
	})

	const ids = tracks.map((t) => t.id)

	return loadPlaylist(ids)
}

/**
 * Updates app state with channel and track to indicate we want to play
 * @param {string[]} ids,
 * @param {number} index
 */
async function loadPlaylist(ids, index = 0) {
	console.log('loadPlaylist', ids?.length, ids[index])
	if (!ids || !ids[index]) throw new Error('uhoh loadplaylist missing stuff')
	await pg.sql`
    UPDATE app_state SET
			playlist_tracks = ${ids},
			playlist_track = ${ids[index]}
  `
}
