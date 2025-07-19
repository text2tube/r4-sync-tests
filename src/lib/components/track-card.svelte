<script lang="ts">
	import {playTrack} from '$lib/api'
	import {formatDate} from '$lib/dates'
	import {extractYouTubeId} from '$lib/utils'
	import type {Track, AppState} from '$lib/types'

	let {
		track,
		index,
		appState,
		showImage = true,
		children
	}: {track: Track; index: number; appState: AppState; showImage: boolean; children: any} = $props()

	const permalink = $derived(`/${track.channel_slug}/tracks/${track.id}`)
	const active = $derived(track.id === appState.playlist_track)
	const ytid = $derived.by(() => extractYouTubeId(track.url))
	const imageSrc = $derived(`https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`)

	const click = (event: MouseEvent) => {
		const el = event.target as HTMLElement
		const clickedDate = el.parentNode instanceof HTMLTimeElement
		if (!clickedDate) {
			event.preventDefault()
			playTrack(track.id, '', 'user_click_track')
		}
	}
	const doubleClick = () => playTrack(track.id, '', 'user_click_track')
</script>

<article class:active>
	<a href={permalink} onclick={click} ondblclick={doubleClick} data-sveltekit-preload-data="tap">
		<span>{index + 1}.</span>
		{#if ytid && showImage}<img loading="lazy" src={imageSrc} alt={track.title} />{/if}
		<div>
			<h3 class="title">{track.title}</h3>
			<div class="description">
				<small>{track.description}</small>
				{#if track.duration}<small>{track.duration}s</small>{/if}
			</div>
		</div>
		<time>
			{#if track.channel_slug}<small class="slug">@{track.channel_slug}</small>{/if}
			<small>{formatDate(track.created_at)}</small></time
		>
	</a>
	{@render children?.({track})}
</article>

<style>
	a {
		display: flex;
		flex-flow: row nowrap;
		/*grid-template-columns: 2rem 1fr auto;*/
		gap: 0 0.5rem;
		padding: 0.6rem 0.5rem 0.5rem 0.25rem;
		line-height: 1.2;
		text-decoration: none;
		cursor: default;

		&:focus {
			outline: 3px solid var(--color-accent);
			outline-offset: -2px;
		}
	}

	a > span:first-child {
		width: 2rem;
		grid-row: span 2;
		color: var(--gray-6);
		font-size: var(--font-size-micro);
		text-indent: 0.2em;
	}

	img {
		width: 3.3rem;
		border-radius: 3px;
		object-fit: contain;
	}

	.title {
		font-size: var(--font-size-regular);
		color: var(--gray-11);
		font-weight: 400;

		.active & {
			font-weight: 600;
			color: var(--color-accent);
		}
	}

	time {
		margin-left: auto;
		display: flex;
		flex-flow: column;
		place-items: flex-end;
		place-content: center;
		/* because this is the actual link with some trickery */
		cursor: pointer;
	}
</style>
