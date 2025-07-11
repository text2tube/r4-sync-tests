<script>
	import {initDb, pg, exportDb} from '$lib/db'
	import {totalSync} from '$lib/sync'
	import {sdk} from '@radio4000/sdk'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import SyncDebug from '$lib/components/sync-debug.svelte'

	let totalSyncing = $state(false)
	let resetting = $state(false)
	let syncProgress = $state({synced: 0, total: 0})

	// Live query for sync progress
	pg.live.query(
		`
		SELECT 
			COUNT(*) FILTER (WHERE tracks_synced_at IS NOT NULL AND firebase_id IS NULL) as synced,
			COUNT(*) FILTER (WHERE firebase_id IS NULL) as total
		FROM channels
	`,
		[],
		(result) => {
			if (result.rows[0]) {
				syncProgress = result.rows[0]
			}
		}
	)

	// /** @type {import('$lib/types').AppState}*/
	// let appState = $state({})

	// Listen to app state updates and update UI.
	// pg.live.query(`select * from app_state where id = 1`, [], (res) => {
	// 	appState = res.rows[0]
	// })

	async function handleTotalSync() {
		totalSyncing = true
		try {
			await totalSync()
		} finally {
			totalSyncing = false
		}
	}

	async function resetDatabase() {
		resetting = true
		try {
			await initDb(true)
			// Force page reload to refresh all state
			window.location.reload()
		} catch (error) {
			console.error('Database reset failed:', error)
			resetting = false
		}
	}

	async function logout() {
		console.log('logout button clicked')
		await sdk.auth.signOut()
	}
</script>

<article>
	<menu>
		<button onclick={resetDatabase} data-loading={resetting} disabled={resetting}>
			{#if resetting}Resetting...{:else}Reset local database{/if}
		</button>
		<button onclick={handleTotalSync} data-loading={totalSyncing} disabled={totalSyncing}>
			{#if totalSyncing}
				Syncing ({syncProgress.synced}/{syncProgress.total})
			{:else}
				Pull channels {syncProgress.total > 0
					? `(${syncProgress.synced}/${syncProgress.total} synced)`
					: ''}
			{/if}
		</button>
		<button disabled>Import local database</button>
		<button onclick={exportDb}>Export local database</button>
	</menu>

	<p>
		On boot, this website prepares a PostgreSQL database in your browser via WASM. You can pull
		channels from R4 (including version 1), use the buttons above &uarr;
	</p>
	<p>All application state interact directly with the local database.</p>

	<p>
		<button onclick={logout}>Logout</button>
	</p>

	<SyncDebug />

	<PgliteRepl />
</article>

<style>
	article {
		margin: 0 0.5rem;
	}
</style>
