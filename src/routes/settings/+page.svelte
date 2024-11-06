<script>
	import {initDb, pg, exportDb} from '$lib/db'
	import {pullChannels, needsUpdate, pullTracks} from '$lib/sync'
	import {pullV1Channels} from '$lib/v1'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import Login from '$lib/components/login.svelte'

	/** @type {import('$lib/types').AppState}*/
	let appState = $state({})
	/** @type {import('$lib/types').Channel[]}*/
	let channels = $state([])
	/** @type {import('$lib/types').Track[]}*/
	let tracks = $state([])

	function update() {
		pg.query(`select * from app_state where id = 1`).then((res) => {
			appState = res.rows[0]
		})
		pg.query(`select * from channels`).then((res) => {
			channels = res.rows
		})
		pg.query(`select * from tracks`).then((res) => {
			tracks = res.rows
		})
	}

	$effect(() => {
		// Fetch on load.
		update()

		// Listen to app state updates and update UI.
		pg.live.query(`select * from app_state where id = 1`, [], (res) => {
			appState = res.rows[0]
		})
	})

	async function maybePullAllTracks() {
		for (const channel of channels) {
			if (await needsUpdate(channel.slug)) {
				if (channel.source === 'v1') {
					await pullV1Tracks(channel.firebase_id)
				} else {
					await pullTracks(channel.slug)
				}
				console.log('updated', slug)
				update()
			} else {
				console.log('no update needed', slug)
			}
		}
	}

	let totalSyncing = $state(false)
	async function totalSync() {
		totalSyncing = true
		await pullChannels()
		await Promise.allSettled([pullV1Channels(), maybePullAllTracks()])
		totalSyncing = false
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

	<h3>Settings</h3>
	<p>{channels.length} channels and {tracks.length} tracks.</p>

	<p>On boot, this website prepares a PostgreSQL database in your browser via WASM.</p>
	<p>You can pull channels from R4 (incl. v1). Tracks are loaded on demand.</p>
	<p>All application and most component state is stored and updated directly to the local database.</p>

	<h2>Account</h2>
	<Login />

	<h2>PGlite REPL</h2>
	<p>
		You have control over your local data(base). Try querying one of the tables `channels`, `tracks` or
		`app_state` using SQL. 
	</p>
	<PgliteRepl />


	<hr />

</article>

<style>
	article {
		margin: 0 1rem;
	}
</style>
