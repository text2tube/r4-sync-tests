<script>
	import Icon from '$lib/components/icon.svelte'
	import Player from '$lib/components/player.svelte'
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'

	gsap.registerPlugin(Draggable, InertiaPlugin)

	let {appState, preloading, playerLoaded} = $props()

	let expanded = $state(false)
	let footerElement

	// Setup GSAP swipe gestures
	$effect(() => {
		if (!footerElement || typeof window === 'undefined') return
		const draggable = Draggable.create(footerElement, {
			type: 'y',
			inertia: false,
			trigger: footerElement,
			allowNativeTouchScrolling: false,
			bounds: {minY: -5, maxY: 5},
			// snap: {y: 0},
			onDragEnd: function () {
				// const velocity = InertiaPlugin.getVelocity(this.target, 'y')
				const dragY = this.y
				expanded = dragY < 0
			}
		})
		return () => {
			draggable[0].kill()
		}
	})
</script>

<footer bind:this={footerElement} class={{expanded, showVideo: appState.show_video_player}}>
	{#if !preloading}
		<Player {appState} bind:expanded={expanded} />
	{/if}
</footer>

<style>
	footer {
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
		background: light-dark(var(--gray-2), var(--gray-3));

		position: fixed;
		left: 0.2rem;
		right: 0.2rem;
		bottom: 0.2rem;
		z-index: 10;
		transition: all 300ms ease-in-out;
		will-change: transform, height;

		&.expanded {
			border: 0;
			height: 100dvh;
			left: 0;
			right: 0;
			bottom: 0;
			display: flex;
			align-items: center;
			place-content: center;
		}
	}
</style>
