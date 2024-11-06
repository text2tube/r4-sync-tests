import {pg} from '$lib/db'
import {needsUpdate, pullTracks} from '$lib/sync'
import {sdk} from '@radio4000/sdk'

/** @typedef {object} User
 * @prop {string} id
 * @prop {string} email
 *

/**
 * Returns a user
 */
export async function checkUser() {
	const {data, error} = await sdk.users.readUser()
	console.log('checkUser', data, error)
	if (!data) {
		await pg.sql`update app_state set channels = null`
	}
	const {data: channels} = await sdk.channels.readUserChannels()
	if (channels) {
		await pg.sql`update app_state set channels = ${channels.map((c) => c.id)}`
	}
	return data
}

/**
 * Just play the channel already. Wait, what does playing a channel even mean? Who am i?
 * @param {string} id
 */
export async function playTrack(id) {
	// @todo check if we need to switch playlist_tracks (different channel)
	console.log('playTrack', id)
	return await pg.sql` UPDATE app_state SET playlist_track = ${id}`
}

/**
 * Just play the channel already. Wait, what does playing a channel even mean? Who am i?
 * @param {import('$lib/types').Channel} channel
 */
export async function playChannel({id, slug}) {
	const index = 0
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
		if (needs) return pullTracks(slug)
	})

	const ids = tracks.map((t) => t.id)

	return loadPlaylist(ids, index)
}

/**
 * @param {string[]} ids,
 * @param {number} index
 */
async function loadPlaylist(ids, index) {
	if (!ids) throw new Error('uhoh')

	console.log('loadPlaylist', ids?.length, index)

	// Update app_state to play the channel
	await pg.sql`
    UPDATE app_state SET
			playlist_tracks = ${ids},
			playlist_track = ${ids[0]}
  `
}

/**
 * @type {object} Change
 * @prop {string} model
 *
 */

/*
const changes = new Set()

const mutations = {
	addTrack: () => {
		// insert into local db
		const change = await sql`...`
		changes.add(change)
	}
}


function applyChanges() {
	for (const c of changes) {
		radio4000.sdk.channels.update(c)
	}
}
*/
