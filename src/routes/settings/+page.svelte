<script>
	import {initDb, pg, exportDb} from '$lib/db'
	import {pullChannels, needsUpdate, pullTracks} from '$lib/sync'
	import {pullV1Channels} from '$lib/v1'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'

	/** @type {import('$lib/types').AppState}*/
	let appState = $state({})

	// Listen to app state updates and update UI.
	pg.live.query(`select * from app_state where id = 1`, [], (res) => {
		appState = res.rows[0]
	})
	// A wrapper around the other sync methods.
	// v2 channels -> v1 channels incl. tracks -> v2 tracks
	let totalSyncing = $state(false)
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
		<button onclick={() => initDb(true).then(update)}>Reset local database</button>
		<button onclick={totalSync} data-loading={totalSyncing} disabled={totalSyncing}>
			{#if totalSyncing}Pulling{:else}Pull{/if} channels
		</button>
		<button disabled>Import local database</button>
		<button onclick={exportDb}>Export local database</button>
	</menu>

	<h1>Settings</h1>
	<p>
		On boot, this website prepares a PostgreSQL database in your browser via WASM. You can pull
		channels from R4 (including version 1), use the buttons above &uarr; All application and most
		component state is stored and updated directly to the local database.
	</p>

	<h2>PGlite REPL</h2>
	<p>
		You have control over your local data(base). Try querying one of the tables `channels`, `tracks`
		or `app_state` using SQL.
	</p>
	<PgliteRepl />

	<hr />
</article>

<style>
	article {
		margin: 0 1rem;
	}
</style>
