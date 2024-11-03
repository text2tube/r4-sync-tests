<script>
	import {PGlite} from '@electric-sql/pglite'
	import {dropAllTables, pg} from '$lib/db'

	let state = $state({})
	let channels = $state([])
	let tracks = $state([])

	$effect(() => {
		pg.live.query(`select * from app_state where id = 1`, [], (res) => {
			state = res.rows[0]
		})
		pg.query(`select * from channels`).then((res) => {
			channels = res.rows
		})
		pg.query(`select * from tracks`).then((res) => {
			tracks = res.rows
		})
	})

	function resetDb() {
		dropAllTables().then(() => {
			location.reload()
		})
	}

	async function exportDb() {
		const file = await pg.dumpDataDir()

		if (typeof window !== 'undefined') {
			// Download the dump
			const url = URL.createObjectURL(file)
			const a = document.createElement('a')
			a.href = url
			a.download = file.name
			a.click()
		}

		const pg2 = new PGlite({
			loadDataDir: file
		})
		const rows = await pg2.query('SELECT name FROM channels;')
		console.log('test query using the exported file as db', rows)
	}
</script>

<article>
	<h2>Debug</h2>
	<menu>
		<button onclick={resetDb}>Reset local database</button>
		<button onclick={exportDb}>Export local database</button>
		<button disabled>Import local database</button>
	</menu>
	<pre>{JSON.stringify(state, null, 2)}</pre>
	<pre>{channels.length} channels</pre>
	<pre>{tracks.length} tracks</pre>

	<hr />

	<h3>What's going on here?</h3>
	<p>
		On load, this website prepares a PostgreSQL database in your browser via WASM. We query all
		channels from the Radio4000 API and copy them into our local one. Same will happen for tracks,
		as they are needed.
	</p>
	<p>Channels are refreshed on load.</p>
	<p>Tracks are currently not refreshed once loaded. To be decided.</p>
	<p>All state is stored and updated directly to the database.</p>
</article>

<style>
	article {
		margin: 0 1rem;
	}
</style>
