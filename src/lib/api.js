import {pg} from '$lib/db'
import {needsUpdate, pullTracks} from '$lib/sync'

/**
 * Just play the channel already. Wait, what does playing a channel even mean? Who am i?
 * @param {number} index
 */
export async function playTrack(index) {
	console.log('playTrack', index + 1)
	return await pg.sql` UPDATE app_state SET playlist_index = ${index + 1}`
}

/**
 * Just play the channel already. Wait, what does playing a channel even mean? Who am i?
 * @param {import('$lib/types').Channel} channel
 */
export async function playChannel({id, slug}) {
	const index = 0
	let tracks = (await pg.sql`select * from tracks where channel_id = ${id}`).rows

	// get tracks if needed
	if (!tracks?.length) {
		await pullTracks(slug)
	}
	tracks = (await pg.sql`select * from tracks where channel_id = ${id}`).rows

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
			playlist_index = ${index}
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
