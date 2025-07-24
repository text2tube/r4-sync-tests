<script>
	import {subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import {togglePlay, next, previous, toggleShuffle, toggleVideo, eject} from '$lib/api/player'
	import {extractYouTubeId} from '$lib/utils'
	import ChannelAvatar from './channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'

	/** @typedef {import('$lib/types').AppState} AppState */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Channel} Channel */

	/** @type {{appState: AppState, expanded: boolean}} */
	let {appState, expanded} = $props()

	/** @type {Track|undefined} */
	let track = $state()

	/** @type {Channel|undefined} */
	let channel = $state()

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	/** @type {boolean} */
	let canPlay = $derived(Boolean(channel && track))

	/** @type {string} */
	let trackImage = $derived.by(() => {
		if (!track?.url) return ''
		const ytid = extractYouTubeId(track.url)
		return ytid ? `https://i.ytimg.com/vi/${ytid}/mqdefault.jpg` : '' // default, mqdefault, hqdefault, sddefault, maxresdefault
	})

	subscribeToAppState(async (state) => {
		const tid = state.playlist_track
		if (tid && tid !== track?.id) await setChannelFromTrack(tid)
	})

	/** @param {string} tid */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const result = await queryTrackWithChannel(tid)
		if (!result) return
		track = result.track
		channel = result.channel
	}
</script>

{#snippet btnPrev()}
	<button onclick={() => previous(track, activeQueue, 'user_prev')}>
		<Icon icon="previous-fill" />
	</button>
{/snippet}

{#snippet btnNext()}
	<button onclick={() => next(track, activeQueue, 'user_next')} disabled={!canPlay}>
		<Icon icon="next-fill" />
	</button>
{/snippet}

{#snippet btnPlay()}
	<button onclick={() => togglePlay(appState)} disabled={!canPlay}>
		<Icon icon={appState.is_playing ? 'pause' : 'play-fill'} />
	</button>
{/snippet}

{#snippet btnShuffle()}
	<button onclick={() => toggleShuffle(appState, trackIds)} class:active={appState.shuffle}>
		<Icon icon="shuffle" />
	</button>
{/snippet}

{#snippet btnEject()}
	<button onclick={() => eject()}>
		<Icon icon="eject" />
	</button>
{/snippet}

{#snippet btnToggleVideo()}
	<button onclick={() => toggleVideo(appState)} title="Show/hide video">
		<Icon icon="video" />
	</button>
{/snippet}

{#snippet channelHeader(showName = false)}
	{#if channel}
		<header class="channel">
			<a href={`/${channel.slug}`}>
				<ChannelAvatar id={channel.image} alt={channel.name} />
			</a>
			{#if showName}
				<h2><a href={`/${channel.slug}`}>{channel.name}</a></h2>
			{/if}
		</header>
	{/if}
{/snippet}

{#snippet trackContent()}
	{#if track}
		<img class="artwork" src={trackImage} alt={track.title} />
		<div class="text">
			<h3>
				<a href={`/${channel.slug}/tracks/${track.id}`}>{track.title}</a>
			</h3>
			{#if track.description}<p><small>{track.description}</small></p>{/if}
		</div>
	{/if}
{/snippet}

{#if !expanded}
	<section class="small">
		{@render channelHeader()}
		{#if !channel}
			<p style="margin-left: 0.5rem">Find something to play!</p>
		{/if}
		{#if channel}
			{@render trackContent()}
		{/if}
		<menu>
			{@render btnPlay()}
			{@render btnNext()}
		</menu>
	</section>
{:else}
	<article class="big">
		{@render channelHeader(true)}

		{#if track}
			{@render trackContent()}
		{:else}
			<p>Waiting for sweet tracks</p>
		{/if}

		<menu>
			{@render btnShuffle()}
			{@render btnPrev()}
			{@render btnPlay()}
			{@render btnNext()}
			{@render btnToggleVideo()}
		</menu>
	</article>
{/if}

<style>
	.small {
		--size: 3rem;
		--gap: 0.2rem;

		display: flex;
		align-items: center;
		min-height: var(--size);
		padding: var(--gap);

		:global(img) {
			width: var(--size);
			height: var(--size);
			border-radius: var(--border-radius);
		}

		.text::after {
			display: block;
			content: '';
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			width: 2rem;
			background: linear-gradient(to left, black, transparent);
		}

		.artwork {
			margin-left: var(--gap);
		}

		h3 {
			font-size: inherit;
		}

		/* no wrapping text */
		h3,
		p {
			margin: 0;
			line-height: initial;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		menu {
			margin-left: auto;
			margin-right: 0.2rem;
		}
	}

	.text {
		flex: 1;
		min-width: 0;
		line-height: 1;
		position: relative;
		overflow: hidden;
		padding-left: 0.4rem;
	}

	h3 a {
		text-decoration: none;
	}

	menu {
		position: relative;
	}

	/* Expanded player styles */
	.big {
		flex: 1;
		display: flex;
		flex-direction: column;
		place-items: center;
		place-content: center;
		text-align: center;
		padding: 2rem;
		gap: 2rem;

		.artwork {
			width: min(80vw, 28rem);
			height: min(80vw, 28rem);
			box-shadow: 0 0.5rem 2rem rgba(0, 0, 0, 0.3);
		}

		.channel {
			display: flex;
			gap: 0.5rem;
			place-items: center;

			:global(img) {
				width: 4rem;
				height: 4rem;
			}

			h2 {
				font-weight: 400;
				a {
					text-decoration: none;
				}
			}
		}

		h3 {
			font-size: var(--font-size-title3);
		}

		/* bigger menu */
		> menu {
			gap: 0.5rem;
			:global(button) {
				padding: 0.2rem 1rem;
			}
			:global(svg) {
				width: 2rem;
				height: 2rem;
			}
		}
	}

	.artwork {
		object-fit: cover;
		border-radius: var(--border-radius);
	}

	button[disabled] :global(.icon) {
		opacity: 0.2;
	}
</style>
