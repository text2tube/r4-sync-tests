<script>
	import {pg} from '$lib/db'
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	/** @param {string} channelId */
	async function deleteTracks(channelId) {
		return pg.sql`DELETE FROM tracks WHERE channel_id = ${channelId}`
	}

	async function doubleclick(event) {
		console.log('doubleclick', event)
		event.target.querySelector('button').click()
	}
</script>

<article ondblclick={doubleclick}>
	<ChannelAvatar id={channel.image} alt={channel.name} />
	<ButtonPlay {channel} />
	{channel.name}
	{#if channel.track_count}
		<small>({channel.track_count})</small>
		<button onclick={() => deleteTracks(channel.id)}>Delete tracks</button>
	{/if}
</article>

<style>
	article {
		position: relative;
		display: flex;
		flex-flow: row wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
	}

	:global(li:not(:hover) .IconBtn) {
		opacity: 0;
	}
	article :global(img) {
		max-width: 3rem;
	}
	article :global(img + button) {
		position: absolute;
		left: 1.3rem;
		background: var(--color-bg-secondary);
	}
	button:last-child {
		margin-left: auto;
	}
</style>
