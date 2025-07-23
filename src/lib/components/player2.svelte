<script>
	import {subscribeToAppState, queryTrackWithChannel} from '$lib/api'
	import {togglePlay, next} from '$lib/api/player'
	import {extractYouTubeId} from '$lib/utils'
	import ChannelAvatar from './channel-avatar.svelte'
	import Icon from '$lib/components/icon.svelte'
	import {onMount, onDestroy} from 'svelte'
	import gsap from 'gsap'

	/** @typedef {import('$lib/types').AppState} AppState */
	/** @typedef {import('$lib/types').Track} Track */
	/** @typedef {import('$lib/types').Channel} Channel */

	/** @type {{appState: AppState, playerExpanded: false}} */
	let {appState, playerExpanded: expanded} = $props()

	/** @type {Track|undefined} */
	let track = $state()

	/** @type {string} */
	let channelName = $state('')
	let channelSlug = $state('')
	let channelImage = $state('')

	/** @type {HTMLElement} */
	let textEl

	/** @type {ResizeObserver|null} */
	let resizeObserver = null

	/** @type {string[]} */
	let trackIds = $derived(appState.playlist_tracks || [])

	/** @type {string[]} */
	let activeQueue = $derived(appState.shuffle ? appState.playlist_tracks_shuffled || [] : trackIds)

	/** @type {string} */
	let trackImage = $derived.by(() => {
		if (!track?.url) return ''
		const ytid = extractYouTubeId(track.url)
		return ytid ? `https://i.ytimg.com/vi/${ytid}/mqdefault.jpg` : ''
	})

	subscribeToAppState(async (state) => {
		const tid = state.playlist_track
		const trackChanged = tid && tid !== track?.id
		if (tid) await setChannelFromTrack(tid)
	})

	/** @param {string} tid */
	async function setChannelFromTrack(tid) {
		if (!tid || tid === track?.id) return
		const result = await queryTrackWithChannel(tid)
		if (!result) return
		track = result.track
		channelName = result.channel.name
		channelSlug = result.channel.slug
		channelImage = result.channel.image
		setupMarquee()
	}

	let setupMarqueeTimeout = null

	function checkOverflow(element) {
		// Small threshold to account for sub-pixel rendering differences
		const threshold = 2
		return element.scrollWidth > element.clientWidth + threshold
	}

	function setupMarquee() {
		if (!textEl) return
		const h3 = textEl.querySelector('h3')
		if (!h3) return
		
		// Debounce rapid calls
		if (setupMarqueeTimeout) {
			clearTimeout(setupMarqueeTimeout)
		}
		
		setupMarqueeTimeout = setTimeout(() => {
			// Reset any existing animation and restore original content
			gsap.killTweensOf(h3)
			gsap.set(h3, { x: 0 })
			
			// Reset to original content if it was duplicated
			const spans = h3.querySelectorAll('span')
			if (spans.length === 2) {
				h3.innerHTML = spans[0].innerHTML
			}
			
			// Force layout recalculation
			h3.offsetHeight
			
			// Check if text overflows with threshold
			if (checkOverflow(h3)) {
				const originalText = h3.innerHTML
				const gap = 40
				
				// Create duplicate for seamless loop
				h3.innerHTML = `<span>${originalText}</span><span style="margin-left: ${gap}px">${originalText}</span>`
				
				// Wait for DOM update
				requestAnimationFrame(() => {
					const firstSpan = h3.firstElementChild
					const spanWidth = firstSpan.scrollWidth + gap
					
					// Seamless infinite loop
					gsap.to(h3, {
						x: -spanWidth,
						duration: spanWidth / 50,
						ease: 'none',
						repeat: -1,
						modifiers: {
							x: gsap.utils.unitize(x => parseFloat(x) % spanWidth)
						}
					})
				})
			}
		}, 100) // 100ms debounce
	}

	function initResizeObserver() {
		if (!textEl || resizeObserver) return
		
		resizeObserver = new ResizeObserver(() => {
			setupMarquee()
		})
		
		resizeObserver.observe(textEl)
	}

	function cleanup() {
		if (resizeObserver) {
			resizeObserver.disconnect()
			resizeObserver = null
		}
		if (setupMarqueeTimeout) {
			clearTimeout(setupMarqueeTimeout)
			setupMarqueeTimeout = null
		}
	}


	$effect(() => {
		if (textEl) {
			initResizeObserver()
			setupMarquee()
		}
	})

	onDestroy(() => {
		cleanup()
	})
</script>

{#if !expanded}
<section>
	<figure>
		<a href={`/${channelSlug}`}>
			<ChannelAvatar id={channelImage} alt={channelName} />
		</a>
	</figure>
	<div class="text" bind:this={textEl}>
		<h3><a href={`/${channelSlug}/tracks/${track?.id}`}>{track?.title}</a></h3>
		<small><a href={`/${channelSlug}`}>{channelName}</a></small>
	</div>
	<menu>
		{#if appState.is_playing}
			<button onclick={() => togglePlay(appState, track)}>
				<Icon icon={'pause'} />
			</button>
		{:else}
			<button onclick={() => togglePlay(appState, track)}>
				<Icon icon={'play-fill'} />
			</button>
		{/if}
		<button onclick={() => next(track, activeQueue, 'user_next')}>
			<Icon icon={'next-fill'} />
		</button>
	</menu>
</section>
{:else}
<article>
	<header>
		<figure>
			{#if trackImage}
				<img src={trackImage} alt={track?.title} />
			{:else}
				<ChannelAvatar id={channelImage} alt={channelName} />
			{/if}
		</figure>
		<div>
			<h2>
				<a href={`/${channelSlug}`}>{channelName}</a>
			</h2>
			<h3>{track?.title}</h3>
		</div>
	</header>
	<main>
		<menu>
			<button>Shuffle</button>
			<button>Previous</button>
			<button>Play</button>
			<button>Next</button>
		</menu>
	</main>
</article>
{/if}

<style>
	section {
		display: flex;
		align-items: center;
	}

	figure {
		flex-shrink: 0;
		width: 3rem;
		position: relative;
	}

	figure img {
		width: 3rem;
	}

	figure::after {
		position: absolute;
		content: "";
		top: 0;
		bottom: 0;
		right: -0.8rem;
		width: 0.8rem;
		background: linear-gradient(to right, var(--gray-1), transparent);
		pointer-events: none;
		z-index: 1;
	}

	.text {
		flex: 1;
		min-width: 0;
		line-height: 1;
		position: relative;
		overflow: hidden;
		padding-left: 0.4rem;
		a {
			text-decoration: none;
		}
	}

	menu::before {
		position: absolute;
		content: "";
		top: 0;
		bottom: 0;
		left: 0;
		width: 0.8rem;
		background: linear-gradient(to left, var(--gray-1), transparent);
		pointer-events: none;
		z-index: 1;
	}

	h3 {
		font-size: inherit;
		line-height: initial;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	menu {
		margin-right: 0.25rem;
		display: flex;
		gap: 0.25rem;
		position: relative;
	}
</style>
