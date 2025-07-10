<script>
	import {pg} from '$lib/db'
	import Tracklist from './tracklist.svelte'

	/** @typedef {import('$lib/types').AppState} AppState */

	/** @type {AppState} */
	let appState = $state({})

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string|undefined} */
	let currentTrackId = $derived(appState.playlist_track)

	pg.live.query(`select * from app_state where id = 1`, [], (res) => {
		appState = res.rows[0] || {}
	})

	function clearQueue() {
		pg.sql`UPDATE app_state SET playlist_tracks = ARRAY[]::UUID[], playlist_track = NULL WHERE id = 1`
	}
</script>

<aside class="queue-aside">
	{#if trackIds.length > 0}
		<header>
			<span class="count">{trackIds.length} tracks queued</span>
			<button onclick={clearQueue}>Clear</button>
		</header>
	{/if}
	<main class="scroll">
		{#if trackIds.length > 0}
			<Tracklist ids={trackIds} currentId={currentTrackId} />
		{:else}
			<div class="empty-state">
				<p>No tracks in queue</p>
				<p><small>Select a channel to start playing</small></p>
			</div>
		{/if}
	</main>
</aside>

<style>
	aside {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: light-dark(var(--gray-1), var(--gray-2));
		border-left: 1px solid var(--gray-5);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-5);
		background: light-dark(var(--gray-2), var(--gray-3));
		font-size: var(--font-size-regular);
	}

	main {
		flex: 1;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;

		p {
			margin: 0;
		}

		small {
			color: var(--gray-9);
		}
	}

</style>
