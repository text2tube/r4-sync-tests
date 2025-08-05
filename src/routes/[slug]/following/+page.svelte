<script>
	import {page} from '$app/stores'
	import {onMount} from 'svelte'
	import {sdk} from '@radio4000/sdk'
	import ChannelCard from '$lib/components/channel-card.svelte'

	let channel = $state(null)
	let followedChannels = $state([])
	let loading = $state(true)
	let error = $state(null)

	onMount(async () => {
		try {
			const slug = $page.params.slug

			// Get the channel info
			const {data: channelData, error: channelError} = await sdk.channels.readChannel(slug)
			if (channelError) throw channelError
			channel = channelData

			// Get who this channel follows
			const {data: followsData, error: followsError} = await sdk.channels.readFollowings(channel.id)
			if (followsError) throw followsError
			followedChannels = followsData || []
		} catch (err) {
			console.error('Failed to load following:', err)
			error = err.message
		} finally {
			loading = false
		}
	})
</script>

<svelte:head>
	<title>{channel?.name ? `${channel.name} - Following` : 'Following'} - R5</title>
</svelte:head>

<main>
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p>Error: {error}</p>
	{:else if channel}
		<header>
			<h1>{channel.name} - Following</h1>
			<p>Channels that {channel.name} follows</p>
		</header>

		{#if followedChannels.length === 0}
			<p>{channel.name} isn't following any channels yet.</p>
		{:else}
			<section class="channels grid">
				{#each followedChannels as followedChannel (followedChannel.id)}
					<ChannelCard channel={followedChannel} />
				{/each}
			</section>
		{/if}
	{/if}
</main>

<style>
	main {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		margin-bottom: 2rem;
	}

	header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2rem;
	}

	header p {
		margin: 0;
		color: var(--gray-10);
	}

	.channels {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}
</style>
