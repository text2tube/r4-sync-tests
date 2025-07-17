<script>
	import {migrateDb, dropDb, pg, exportDb} from '$lib/db'
	import {sync} from '$lib/sync'
	import {sdk} from '@radio4000/sdk'
	import PgliteRepl from '$lib/components/pglite-repl.svelte'
	import SyncDebug from '$lib/components/sync-debug.svelte'
	import ShortcutsEditor from '$lib/components/shortcuts-editor.svelte'

	let syncing = $state(false)
	let resetting = $state(false)

	async function handleSync() {
		syncing = true
		try {
			await sync()
		} catch (err) {
			console.error(err)
		} finally {
			syncing = false
		}
	}

	async function resetDatabase() {
		resetting = true
		try {
			await dropDb()
			await migrateDb()
			// Live queries don't recover well from table drops, so reload, and without a timeout it's too fast :/
			setTimeout(() => {
				//window.location.reload()
			}, 100)
		} catch (error) {
			console.error('dropDb + migrateDb() failed:', error)
		} finally {
			resetting = false
		}
	}

	async function logout() {
		await sdk.auth.signOut()
	}
</script>

<article>
	<menu>
		<button onclick={resetDatabase} data-loading={resetting} disabled={resetting}>
			{#if resetting}Resetting...{:else}Reset local database{/if}
		</button>
		<button onclick={handleSync} data-loading={syncing} disabled={syncing}>
			{#if syncing}
				Syncing
			{:else}
				Sync
			{/if}
		</button>
		<!-- <button disabled>Import local database</button> -->
		<button onclick={exportDb}>Export local database</button>
	</menu>

	<p>
		On boot, this website prepares a PostgreSQL database in your browser via WASM. You can pull
		channels from R4 (including version 1), use the buttons above &uarr;
	</p>
	<p>All application state interact directly with the local database.</p>

	<hr />
	<ShortcutsEditor />
	<hr />
	<button onclick={logout}>Logout</button>
	<hr />
	<PgliteRepl />
	<hr />
	<SyncDebug />
</article>

<style>
	article {
		margin: 0 0.5rem;
	}
</style>
