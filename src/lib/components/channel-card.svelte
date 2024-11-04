<script>
	import {pg} from '$lib/db'
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {shouldReloadTracks, syncTracks} from '$lib/sync'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	let deleting = $state(false)
	async function deleteTracks() {
		deleting = true
		await pg.sql`DELETE FROM tracks WHERE channel_id = ${channel.id}`
		await pg.sql`update channels set tracks_outdated = ${true} where id = ${channel.id}`
		console.log('Deleted tracks')
		deleting = false
	}

	/** @param {MouseEvent} event */
	async function doubleclick(event) {
		event.currentTarget.querySelector('button')?.click()
	}

	async function checkCache() {
		const needsUpdate = await shouldReloadTracks(channel.id)
		if (needsUpdate) await syncTracks(channel.slug)
	}
</script>

<article ondblclick={doubleclick} data-busy={channel.busy}>
	<figure><ChannelAvatar id={channel.image} alt={channel.name} /></figure>
	<ButtonPlay {channel} />
	<div>
		<h3>{channel.name}</h3>
		<p>
			{#if channel.busy}<small>busy</small>{/if}
			{#if channel.track_count}
				<small>({channel.track_count})</small>
			{/if}
		</p>
	</div>
	<menu>
		{#if channel.tracks_outdated}
			<button data-loading={channel.busy} onclick={checkCache}>Pull</button>
		{:else}
			<button
				data-loading={deleting}
				title="Just for testing"
				onclick={() => deleteTracks(channel.id)}
			>
				{#if deleting}Deleting{:else}Delete tracks{/if}
			</button>
		{/if}
	</menu>
</article>

<style>
	article {
		position: relative;
		display: flex;
		flex-flow: row wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
	}
	figure {
		width: 3rem;
	}
	article :global(figure + button) {
		position: absolute;
		left: 0.75rem;
		background: var(--color-bg-secondary);
		width: 2.5rem;
		border: 0;
		box-shadow: none;
	}
	:global(li:not(:hover) .IconBtn) {
		opacity: 0;
	}
	[data-busy='true'] {
		cursor: wait;
	}
	menu {
		margin-left: auto;
		display: flex;
	}
	h3 {
		font-size: 1rem;
		font-weight: normal;
	}
	h3,
	p {
		margin: 0;
		line-height: 1.2;
	}
</style>
