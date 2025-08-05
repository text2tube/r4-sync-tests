<script>
	import {appState} from '$lib/app-state.svelte'
	import ChannelCard from '$lib/components/channel-card.svelte'

	/** @type {import('./$types').PageData} */
	let {data} = $props()

	let followings = $derived(data.followings)
</script>

<svelte:head>
	<title>Following - R5</title>
</svelte:head>

<header>
	<h1>Following</h1>
	<p>
		{followings.length} channels
		{#if !appState.channels?.length}
			· sign in to sync with remote
		{/if}
	</p>
</header>

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

<style>
	header {
		margin: 0.5rem 0.5rem 2rem;
	}

	header p {
		margin: 0;
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
