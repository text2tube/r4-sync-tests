<script>
	import {pg} from '$lib/db'
	import Error from '../+error.svelte'

	let items

	async function importFromV1() {
		const res = await fetch('/radio4000-channels-export-modified.json')
		items = await res.json()
		console.log('channels from local file', items)

		// remove duplicates (e.g. channels already in the database, be it from v2 or whatever)
		const {rows} = await pg.sql`select slug from channels`
		const notDuplicates = items.filter((item) => {
			return !rows.some((row) => row.slug === item.slug)
		})
		console.log('Removed duplicates', items.length - notDuplicates.length)

		const hasStuff = items.filter((item) => {
			return item.image && item.track_count > 4
		}).slice(0,3)
		console.log('Removed boring ones', notDuplicates.length - hasStuff.length)

		try {
			await pg.transaction(async (tx) => {
				for (const item of hasStuff) {
					await tx.sql`
					insert into channels (id, created_at, updated_at, slug, name, description, image, source)
					values (${item.firebase_id}, ${item.created_at}, ${item.updated_at}, ${item.slug}, ${item.name}, ${item.description}, ${item.image}, 'v1') on conflict (id) do nothing
					`
					console.log('inserted', item)
				}
			})
		} catch (err) {
			console.log('failed to insert v1 channels', err)
		}
		console.log('Inserted channels from v1', hasStuff)

		for (const item of hasStuff) {
			console.log('trying to insert tracks', item)
			await fetchV1ChannelTracks(item.firebase_id)
			console.log('inserted incl. tracks', item.slug)
		}
	}

function findV1TracksByChannel(id) {
	if (typeof id !== 'string') {
		throw new TypeError('Pass a string with a valid channel id')
	}
	// Firebase queries through REST are not sorted.
	const url = `https://radio4000.firebaseio.com/tracks.json?orderBy="channel"&startAt="${id}"&endAt="${id}"`
	return fetch(url).then(res => res.json())
	.then(toArray)
	.then(arr => arr.sort((a, b) => a.created - b.created))
	
}

const toObject = (obj, id) => Object.assign(obj, {id})
const toArray = data => Object.keys(data).map(id => toObject(data[id], id))

	/**
	 * Imports tracks from a v1 channel
	 * @param {string} channelFirebaseId
	 */
	async function fetchV1ChannelTracks(channelFirebaseId) {
		if (!items) return
		const channel = items.find((item) => item.firebase_id === channelFirebaseId)
		console.log(channelFirebaseId, channel)
		const trackIds = Object.keys(channel.tracks)

		const test = await findV1TracksByChannel(channelFirebaseId)

		const tracks = test.map(track => ({
			id: track.id,
			channel_id: channelFirebaseId,
			url: track.url,
			title: track.title,
			description: track.body || '',
			discogs_url: track.discogs || '',
			created_at: new Date(track.created).toISOString(),
			updated_at: new Date(track.updated || track.created).toISOString()
		}))

		console.log('Inserting tracks from v1', tracks)
		return await pg.transaction(async (tx) => {
			for (const item of tracks.map((result) => result.value).filter(Boolean)) {
				await tx.sql`
					insert into tracks (id, channel_id, created_at, updated_at, title, description, url, discogs_url)
					values (${item.id}, ${channelFirebaseId}, ${item.created_at}, ${item.updated_at}, ${item.title}, ${item.description}, ${item.url}, ${item.discogs_url}) on conflict do nothing;
				`
			}
			console.log('it worked...')
		})
	}
</script>

<h1>v1 test</h1>

<button onclick={importFromV1}>Import from v1</button>
