<script>
	import {initDb, pg, exportDb} from '$lib/db'
	import {pullChannels, needsUpdate, pullTracks} from '$lib/sync'
	import {pullV1Channels} from '$lib/v1'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'

	let totalSyncing = $state(false)

	// /** @type {import('$lib/types').AppState}*/
	// let appState = $state({})

	// Listen to app state updates and update UI.
	// pg.live.query(`select * from app_state where id = 1`, [], (res) => {
	// 	appState = res.rows[0]
	// })

	// A wrapper around the other sync methods.
	// v2 channels -> v1 channels incl. tracks -> v2 tracks
	async function totalSync() {
		console.time('totalSync')
		totalSyncing = true
		await pullChannels()
		const {rows} = await pg.query(`select * from channels where firebase_id is null`)
		await Promise.allSettled([
			pullV1Channels(),
			rows.map(async ({slug}) => {
				if (await needsUpdate(slug)) {
					pullTracks(slug)
				}
			})
		])
		totalSyncing = false
		console.timeEnd('totalSync')
	}
</script>

<article>
	<menu>
		<button onclick={() => initDb(true)}>Reset local database</button>
		<button onclick={totalSync} data-loading={totalSyncing} disabled={totalSyncing}>
			{#if totalSyncing}Pulling{:else}Pull{/if} channels
		</button>
		<button disabled>Import local database</button>
		<button onclick={exportDb}>Export local database</button>
	</menu>

	<p>
		On boot, this website prepares a PostgreSQL database in your browser via WASM. You can pull
		channels from R4 (including version 1), use the buttons above &uarr;
	</p>
	<p>All application state interact directly with the local database.</p>

	<PgliteRepl />
</article>

<style>
	article {
		margin: 0 0.5rem;
	}
</style>
