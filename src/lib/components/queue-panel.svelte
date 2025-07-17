<script>
	import {pg} from '$lib/db'
	import {liveQuery, incrementalLiveQuery} from '$lib/live-query'
	import Tracklist from './tracklist.svelte'

	/** @typedef {import('$lib/types').AppState} AppState */

	const {appState} = $props()

	let view = $state('queue') // 'queue' or 'history'

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {import('$lib/types').Track[]} */
	let queueTracks = $state([])

	/** @type {(import('$lib/types').Track & import('$lib/types').PlayHistory)[]} */
	let playHistory = $state([])

	$effect(() => {
		if (trackIds.length === 0) {
			queueTracks = []
			return
		}

		const uniqueIds = [...new Set(trackIds)]
		return incrementalLiveQuery(
			`SELECT * FROM tracks WHERE id IN (select unnest($1::uuid[]))`,
			[uniqueIds],
			'id',
			(res) => {
				const trackMap = new Map(res.rows.map((track) => [track.id, track]))
				queueTracks = trackIds.map((id) => trackMap.get(id)).filter(Boolean)
			}
		)
	})

	$effect(() => {
		return liveQuery(
			`SELECT t.*, h.started_at, h.ended_at, h.ms_played, h.reason_start, h.reason_end, h.skipped 
			 FROM play_history h 
			 JOIN tracks t ON h.track_id = t.id 
			 ORDER BY h.started_at ASC LIMIT 50`,
			[],
			(res) => {
				playHistory = res.rows
			}
		)
	})

	function clearQueue() {
		pg.sql`UPDATE app_state SET playlist_tracks = ARRAY[]::UUID[], playlist_track = NULL WHERE id = 1`
	}

	function clearHistory() {
		pg.sql`DELETE FROM play_history`
	}
</script>

<aside>
	<header>
		<div class="view-buttons">
			<button onclick={() => (view = 'queue')} class:active={view === 'queue'}>Queue</button>
			<button onclick={() => (view = 'history')} class:active={view === 'history'}>History</button>
		</div>
		{#if view === 'queue' && trackIds.length > 0}
			<button onclick={clearQueue}>Clear</button>
		{:else if view === 'history' && playHistory.length > 0}
			<button onclick={clearHistory} title="Clear playlist history">Clear</button>
		{/if}
	</header>
	<main class="scroll">
		{#if view === 'queue'}
			{#if trackIds.length > 0}
				<Tracklist tracks={queueTracks} />
			{:else}
				<div class="empty-state">
					<p>No tracks in queue</p>
					<p><small>Select a channel to start playing</small></p>
				</div>
			{/if}
		{:else if playHistory.length > 0}
			<ul class="list tracks">
				{#each playHistory as entry, index}
					<li ondblclick={() => playTrack(entry.id, null, 'user_click')}>
						<span>{index + 1}.</span>
						<div class="title">{entry.title}</div>
						<div class="description">
							<small>
								{new Date(entry.started_at).toLocaleTimeString()}
								{#if entry.reason_start}• {entry.reason_start}{/if}
								{#if entry.reason_end}→ {entry.reason_end}{/if}
								{#if entry.ms_played}• {Math.round(entry.ms_played / 1000)}s{/if}
							</small>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="empty-state">
				<p>No play history</p>
				<p><small>Start playing tracks to see history</small></p>
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

		/* perf trick! */
		contain: layout size;
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

	.view-buttons {
		display: flex;
		gap: 0.25rem;
	}

	.view-buttons button.active {
		background: var(--gray-4);
	}

	main {
		flex: 1;
		padding-bottom: 12rem;
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
