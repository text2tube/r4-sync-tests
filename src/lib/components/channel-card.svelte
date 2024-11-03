<script>
	import {pg} from '$lib/db'
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {shouldReloadTracks, syncTracks} from '$lib/sync'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	async function deleteTracks() {
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${channel.id}`
		await pg.sql`update channels set tracks_outdated = ${true} where id = ${channel.id}`
		console.log('deleted tracks')
	}

	async function doubleclick(event) {
		console.log('doubleclick', event)
		event.target.querySelector('button').click()
	}

	async function checkCache() {
		const needsUpdate = await shouldReloadTracks(channel.id)
		if (needsUpdate) await syncTracks(channel.slug)
	}
</script>

<article ondblclick={doubleclick}>
	<ChannelAvatar id={channel.image} alt={channel.name} />
	<ButtonPlay {channel} />
	<div>
		{channel.name}<br />
		{#if channel.busy}<small>busy</small>{/if}
		{#if channel.track_count}
			<small>({channel.track_count})</small>
		{/if}
	</div>
	<menu>
		{#if channel.tracks_outdated}
			<button data-loading={channel.busy} onclick={checkCache}>Pull</button>
		{/if}
		<button onclick={() => deleteTracks(channel.id)}>Delete tracks</button>
	</menu>
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
	menu {
		margin-left: auto;
		display: flex;
	}
</style>
