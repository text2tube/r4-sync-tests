<script>
	import {pg} from '$lib/db'
	import {sdk} from '@radio4000/sdk'
	import {
		startBroadcasting,
		stopBroadcasting,
		joinBroadcast,
		leaveBroadcast
	} from '$lib/services/broadcast'
	import {readBroadcasts} from '$lib/api'

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	/** @type {import('$lib/types').Track|undefined} */
	let currentTrack = $state()
	/** @type {import('$lib/types').Channel|undefined} */
	let currentChannel = $state()
	let testChannelId = $state('')
	/** @type {any[]} */
	let activeBroadcasts = $state([])

	const channelId = $derived(appState.channels?.[0])
	const broadcasting = $derived(!!appState.broadcasting_channel_id)
	const listening = $derived(!!appState.listening_to_channel_id)

	pg.live.query('SELECT * FROM app_state WHERE id = 1', [], async (res) => {
		appState = res.rows[0]

		if (channelId) {
			const channelRes = await pg.sql`SELECT * FROM channels WHERE id = ${channelId}`
			currentChannel = channelRes.rows[0]
		} else {
			currentChannel = undefined
		}

		if (appState.playlist_track) {
			const trackRes = await pg.sql`SELECT * FROM tracks WHERE id = ${appState.playlist_track}`
			currentTrack = trackRes.rows[0]
		}
	})

	pg.live.query(`
		SELECT 
			b.channel_id,
			b.track_id,
			b.track_played_at,
			c.name as channel_name,
			c.slug as channel_slug
		FROM broadcasts b
		LEFT JOIN channels c ON b.channel_id = c.id
		ORDER BY b.track_played_at DESC
	`, [], (res) => {
		activeBroadcasts = res.rows
	})
</script>

<section>
	<h2>Broadcast from {currentChannel?.name}</h2>

	{#if channelId}
		{#if currentTrack && currentChannel}
			<p><strong>Track:</strong> {currentTrack.title}</p>
				{#if broadcasting}
					<button onclick={() => stopBroadcasting()}> 🔴 Stop Broadcasting </button>
				{:else}
					<button
						onclick={async () => {
							if (!currentChannel || !currentTrack) {
								alert(
									'You need to be playing a track to start broadcasting. Go to the home page and start playing music first.'
								)
								return
							}
							const player = /** @type {HTMLElement & {paused: boolean, play(): void} | null} */ (
								document.querySelector('youtube-video')
							)
							if (player?.paused) player.play()
							await startBroadcasting(currentChannel.id)
						}}
					>
						📡 Start Broadcasting
					</button>
				{/if}
		{:else}
			<p>No track currently playing. Go to the <a href="/">home page</a> to start a track first.</p>
		{/if}
	{:else}
		<p><a href="/login">Sign in</a> to start broadcasting.</p>
	{/if}
</section>

<section>
	<h2>Live Broadcasts</h2>

	{#if activeBroadcasts.length > 0}
		<ul>
			{#each activeBroadcasts as broadcast (broadcast.channel_id)}
				<li>
					<div>
						<strong>{broadcast.channel_name}</strong>
						<p>🎵 Track: {broadcast.track_id}</p>
						<small>Started: {new Date(broadcast.track_played_at).toLocaleTimeString()}</small>
					</div>
					<button onclick={() => joinBroadcast(broadcast.channel_id)}> 🎧 Join </button>
				</li>
			{/each}
		</ul>
	{:else}
		<p>No active broadcasts found.</p>
	{/if}
</section>

<section>
	<h2>Debug Info</h2>
	<details>
		<summary>App State</summary>
		<pre>{JSON.stringify(appState, null, 2)}</pre>
	</details>

	<details>
		<summary>Current Track</summary>
		<pre>{JSON.stringify(currentTrack, null, 2)}</pre>
	</details>

	<details>
		<summary>Current Channel</summary>
		<pre>{JSON.stringify(currentChannel, null, 2)}</pre>
	</details>
</section>

<style>
	section {
		margin: 0.5rem;
		padding: 1rem;
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
	}

	menu {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
		padding: 0;
	}

	input {
		padding: 0.5rem;
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
		margin-left: 0.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
	}

	pre {
		background: var(--gray-2);
		padding: 1rem;
		border-radius: var(--border-radius);
		overflow-x: auto;
	}
</style>
