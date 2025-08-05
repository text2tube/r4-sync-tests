<script>
	import {onMount} from 'svelte'
	import {appState} from '$lib/app-state.svelte'
	import {pullFollowers} from '$lib/sync'
	import ChannelCard from '$lib/components/channel-card.svelte'

	let followings = $state([])
	let loading = $state(true)

	async function loadFollowings() {
		const userChannelId = appState.channels?.length ? appState.channels[0] : 'local-user'

		// Auto-sync remote when signed in
		if (appState.channels?.length) {
			try {
				await pullFollowers(userChannelId)
			} catch (err) {
				console.warn('Auto-sync failed:', err)
			}
		}

		// Show unified local view
		const {rows} = await window.r5.pg.sql`
			SELECT f.channel_id, f.created_at, c.name, c.slug, c.image, c.description
			FROM followers f
			LEFT JOIN channels c ON f.channel_id = c.id
			WHERE f.follower_id = ${userChannelId}
			ORDER BY f.created_at DESC
		`

		followings = rows.map((row) => ({
			id: row.channel_id,
			name: row.name || `Channel ${row.channel_id.slice(0, 8)}...`,
			slug: row.slug,
			image: row.image,
			description: row.description,
			created_at: row.created_at
		}))
	}

	onMount(async () => {
		try {
			await loadFollowings()
		} catch (err) {
			console.error('Failed to load following:', err)
		} finally {
			loading = false
		}
	})
</script>

<svelte:head>
	<title>Following - R5</title>
</svelte:head>

<header>
	<h1>Following</h1>
	{#if loading}
		<p>Loading...</p>
	{:else}
		<p>
			{followings.length} channels
			{#if !appState.channels?.length}
				· sign in to sync with remote
			{/if}
		</p>
	{/if}
</header>

{#if !loading}
	{#if followings.length === 0}
		<p>Browse channels and tap the heart to follow them.</p>
	{:else}
		<div class="grid">
			{#each followings as following (following.id)}
				{#if following.name}
					<ChannelCard channel={following} />
				{:else}
					<article class="channel-placeholder">
						<h3>{following.name}</h3>
						<p>Channel data not synced yet</p>
					</article>
				{/if}
			{/each}
		</div>
	{/if}
{/if}

<style>
	header {
		margin: 0.5rem 0.5rem 2rem;
		p {
			margin: 0;
		}
	}

	.channel-placeholder {
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		text-align: center;
	}

	.channel-placeholder h3 {
		margin: 0.5rem 0 0.25rem;
		font-size: 1rem;
	}

	.channel-placeholder p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}
</style>
