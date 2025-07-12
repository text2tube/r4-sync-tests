<script>
	import {pg} from '$lib/db'
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'
	import {needsUpdate, pullTracks} from '$lib/sync'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	/** @param {MouseEvent} event */
	async function doubleclick(event) {
		event.currentTarget?.querySelector('button')?.click()
	}
</script>

<article ondblclick={doubleclick} data-busy={channel.busy}>
	<figure><ChannelAvatar id={channel.image} alt={channel.name} /></figure>
	<ButtonPlay {channel} />
	<div>
		<h3>
			<a href={`/${channel.slug}`}>{channel.name}</a>
			{#if channel.broadcasting}
				<span class="live-indicator">🔴 LIVE</span>
			{/if}
		</h3>
		<p>
			{channel.description}
			{#if channel.track_count}
				<small>({channel.track_count})</small>
			{:else}{/if}
		</p>
	</div>
</article>

<style>
	article {
		position: relative;
		display: flex;
		flex-flow: row nowrap;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;

		:global(.list) & {
			display: grid;
			grid-template-columns: 4rem auto;
			align-items: center;
		}

		:global(.grid) & {
			display: flex;
			flex-flow: column nowrap;
			/* hide channel description in grid view */
			h3 + p {
				display: none;
			}
		}
	}

	figure {
		max-width: 25vw;
	}

	article :global(figure + button) {
		position: absolute;
		left: 0.75rem;
		background: var(--gray-2);
		width: 2.5rem;
		border: 0;
		box-shadow: none;
		transition: 0;
	}

	/** hide play button unles hovered */
	:global(li:not(:hover) .IconBtn) {
		opacity: 0;
	}

	[data-busy='true'] {
		cursor: wait;
	}

	menu {
		margin-left: auto;
	}
	menu:not([hidden]) {
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
	h3 + p {
		color: var(--gray-10);
		font-size: var(--font-size-regular);
	}

	.live-indicator {
		color: red;
		font-size: 0.8rem;
		font-weight: bold;
		margin-left: 0.5rem;
	}
</style>
