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
	$effect(() => {
		const liveQuery = pg.live.query(
			`
			SELECT 
				COUNT(*) FILTER (WHERE tracks_synced_at IS NOT NULL AND firebase_id IS NULL) as synced,
				COUNT(*) FILTER (WHERE firebase_id IS NULL) as total
			FROM channels
		`,
			[],
			(result) => {
				console.log('syncProgress', result)
				if (result.rows[0]) {
					const row = result.rows[0]
					syncProgress = {
						synced: Number(row.synced),
						total: Number(row.total)
					}
				}
			}
		)

		// Cleanup function - unsubscribe when effect re-runs or component unmounts
		return () => {
			liveQuery.then(({unsubscribe}) => unsubscribe())
		}
	})

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
			console.log('Database reset')
		} catch (error) {
			console.error('Database reset failed:', error)
		} finally {
			resetting = false
			// Live queries don't recover well from table drops, so reload, and without a timeout it's too fast :/
			setTimeout(() => {
				window.location.reload()
			}, 100)
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
