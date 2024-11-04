<script>
	import {initDb, pg, exportDb} from '$lib/db'
	import {pullChannels, needsUpdate, pullTracks} from '$lib/sync'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'

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

	let busyTracks = $state(false)
	async function maybePullAllTracks() {
		busyTracks = true
		for (const channel of channels) {
			if (await needsUpdate(channel.slug)) {
				await pullTracks(channel.slug)
				update()
			}
		}
		busyTracks = false
	}
</script>

<article>
	<h2>Settings</h2>
	<menu>
		<button onclick={() => initDb(true).then(update)}>Reset local database</button>
		<button onclick={() => pullChannels().then(update)}>Pull channels</button>
		<button data-loading={busyTracks} disabled={busyTracks} onclick={maybePullAllTracks}
			>{#if busyTracks}Pulling{:else}Pull{/if} tracks</button
		>
		<button disabled>Import local database</button>
		<button onclick={exportDb}>Export local database</button>
	</menu>
	<pre>{JSON.stringify(appState, null, 2)}</pre>
	<pre>{channels.length} channels</pre>
	<pre>{tracks.length} tracks</pre>

	<PgliteRepl />

	<hr />

	<h3>What's going on here?</h3>
	<p>On boot, this website prepares a PostgreSQL database in your browser via WASM.</p>
	<p>Channels are pulled in the start up. Tracks are loaded on demand.</p>
	<p>Tracks are currently not refreshed once loaded. To be decided.</p>
	<p>All application and most component state is stored and updated directly to the database.</p>
</article>

<style>
	article {
		margin: 0 1rem;
	}
</style>
