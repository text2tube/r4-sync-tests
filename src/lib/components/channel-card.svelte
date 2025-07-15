<script>
	import {pg} from '$lib/db'
	import {needsUpdate, pullTracks} from '$lib/sync'
	import ButtonPlay from './button-play.svelte'
	import ChannelAvatar from './channel-avatar.svelte'

	/** @type {{channel: import('$lib/types').Channel}}*/
	let {channel} = $props()

	/** @param {MouseEvent} event */
	async function doubleclick({currentTarget}) {
		if (currentTarget instanceof HTMLElement) {
			currentTarget.querySelector('button')?.click()
		}
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

		:global(.list) & {
			display: grid;
			grid-template-columns: 4rem auto;
			align-items: center;
			padding: 0.25rem 0.5rem;
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
		max-width: 50vw;
		aspect-ratio: 1/1;
		/* for channels with no image */
		min-height: 2rem;
		background: var(--gray-2);
	}

	article :global(figure + button) {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		background: var(--gray-2);
		width: 4rem;
		border: 0;
		box-shadow: none;
		transition: none;
	}

	/** hide play button unles hovered */
	article:not(article:hover) :global(figure + button) {
		opacity: 0;
	}

	[data-busy='true'] {
		cursor: wait;
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
