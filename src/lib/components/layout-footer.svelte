<script>
	import Icon from '$lib/components/icon.svelte'
	import Player2 from '$lib/components/player2.svelte'
	import gsap from 'gsap'
	import {Draggable} from 'gsap/Draggable'
	import {InertiaPlugin} from 'gsap/InertiaPlugin'

	gsap.registerPlugin(Draggable, InertiaPlugin)

	let {appState, preloading, playerLoaded} = $props()

	let playerExpanded = $state(false)
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
			snap: {y: 0},
			onDragEnd: function () {
				const velocity = InertiaPlugin.getVelocity(this.target, 'y')
				const dragY = this.y

				console.log(`Y Velocity: ${velocity}, Drag Y: ${dragY}`)

				if (dragY < 0) {
					playerExpanded = true
				} else if (dragY > 0) {
					playerExpanded = false
				}
			}
		})
		console.log(footerElement, draggable)
		return () => {
			draggable[0].kill()
		}
	})
</script>

<footer bind:this={footerElement} class={{expanded: playerExpanded}}>
	<label class="toggle">
		<Icon icon="chevron-up" size={24} />
		<Icon icon="chevron-down" size={24} />
		<input type="checkbox" name="playerLayout" bind:checked={playerExpanded} />
	</label>
	{#if !preloading && playerLoaded}
		<Player2 {appState} {playerExpanded} />
	{/if}
</footer>

<style>
	footer {
		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
		background: light-dark(var(--gray-2), var(--gray-3));

		position: fixed;
		left: 0.5rem;
		right: 0.5rem;
		bottom: 1.5rem;
		z-index: 10;
		transition: all 400ms ease-in-out;

		&.expanded {
			height: calc(100dvh - 1.5rem);
		}
	}

	.toggle {
		position: absolute;
		top: -0.6rem;
		left: 0;
		right: 0;
		display: none;
		display: flex;
		place-content: center;
		input {
			display: none;
		}
		:global(.icon) {
			width: 1.5rem;
			opacity: 0.5;
		}
	}

	.expanded .toggle {
		:global(.icon:first-child) {
			display: none;
		}
	}
	:not(.expanded) .toggle {
		:global(.icon:nth-child(2)) {
			display: none;
		}
	}

	.toggle {
	}
</style>
