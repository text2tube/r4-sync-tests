import {pg, debugLimit} from '$lib/db'

/**
 * Imports a local export of v1 channels, imports them
 * It will not overwrite existing channels when slug exists.
 */
export async function pullV1Channels() {
	const res = await fetch('/r5-channels.json')
	const items = (await res.json()).slice(0, debugLimit)

	// Since we don't want to overwrite any existing local channels with v1 channels,
	// we filter them out here.
	const {rows} = await pg.sql`select slug from channels`
	const channels = items.filter(
		(item) => !rows.some((r) => r.slug === item.slug) && item.track_count > 3
	)

	try {
		await pg.transaction(async (tx) => {
			for (const item of channels) {
				try {
					await tx.sql`
					insert into channels (created_at, updated_at, slug, name, description, image, firebase_id)
					values (${item.created_at}, ${item.updated_at || item.created_at}, ${item.slug}, ${item.name}, ${item.description}, ${item.image}, ${item.firebase_id}) on conflict (slug) do nothing
					`
				} catch (err) {
					console.warn('Failed to insert v1 channel', item.slug, err)
				}
			}
		})
	} catch (err) {
		console.warn('Failed to insert v1 channels', err)
	}
	console.log('Pulled v1 channels', channels)
}

/**
 * Imports tracks from a v1 channel
 * @param {string} channelId
 * @param {string} channelFirebaseId
 * @param {typeof pg} [pg]
 */
export async function pullV1Tracks(channelId, channelFirebaseId, pg) {
	if (!pg) throw new Error('Missing pg')

	const v1Tracks = await readFirebaseChannelTracks(channelFirebaseId)
	const tracks = v1Tracks.map((track) => ({
		firebase_id: track.id,
		channel_id: channelId,
		url: track.url,
		title: track.title,
		description: track.body || '',
		discogs_url: track.discogsUrl || '',
		created_at: new Date(track.created).toISOString(),
		updated_at: new Date(track.updated || track.created).toISOString()
	}))

	const {rows: existingTracks} = await pg.sql`select firebase_id from tracks where channel_id = ${channelId}`
	const newTracks = tracks.filter((t) => !existingTracks.some((x) => x.firebase_id === t.firebase_id))
	for (const item of newTracks) {
		try {
			await pg.sql`
				insert into tracks (firebase_id, channel_id, created_at, updated_at, title, description, url, discogs_url)
				values (${item.firebase_id}, ${channelId}, ${item.created_at}, ${item.updated_at}, ${item.title}, ${item.description}, ${item.url}, ${item.discogs_url}) on conflict (firebase_id) do nothing;
			`
			await pg.sql`update channels set busy = false, tracks_synced_at = CURRENT_TIMESTAMP where id = ${channelId}`
		} catch (error) {
			await pg.sql`update channels set busy = false where id = ${channelId}`
			throw error
		}
	}

	await pg.sql`update channels set busy = false where id = ${channelId}`
	console.log(`Pulled v1 tracks (${existingTracks.length} existing skipped)`, newTracks.length)
}

/**
 * Fetches all v1 tracks from a v1 channel id
 * @param {string} cid
 */
async function readFirebaseChannelTracks(cid) {
	const toObject = (value, id) => ({...value, id})
	const toArray = (data) => Object.keys(data).map((id) => toObject(data[id], id))
	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${cid}"&endAt="${cid}"`
	return fetch(url)
		.then((res) => res.json())
		.then(toArray)
		// Firebase queries through REST are not sorted, so we sort..
		.then((arr) => arr.sort((a, b) => a.created - b.created))
}
