<script>
	import '../styles/style.css'
	import {initDb, pg} from '$lib/db'
	import Player from '$lib/components/player.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import InternetIndicator from '$lib/components/internet-indicator.svelte'
	import {IconChevronUp, IconChevronDown} from 'obra-icons-svelte'
	import {navigating} from '$app/stores'

	let {children} = $props()

	let preloading = $state(true)

	$effect(() => {
		initDb().then(() => {
			preloading = false
		})
	})

	/** @type {HTMLInputElement|undefined} */
	let playerLayoutCheckbox = $state()

	/**
	 * Close the player overlay, if open, on escape key press.
	 * @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.key === 'Escape' && playerLayoutCheckbox?.checked) playerLayoutCheckbox.click()
	}

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	// $effect(() => {
	// 	window.addEventListener('beforeunload', async (event) => {
	// 		event.preventDefault()
	// 		await pg.close()
	// 	})
	// })
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="layout">
	<header>
		<a href="/">
			{#if preloading}
				R0
			{:else}
				<TestCounter />
			{/if}
		</a>
		<!--<a href="/v1">v1</a>-->
		<a href="/settings">Settings</a>
		<InternetIndicator />
		<AddTrackModal />
		<ThemeToggle />
	</header>

	<main>
		{#if preloading}
			<center>
				<p>Preloading...</p>
			</center>
		{:else}
			{@render children()}
		{/if}
	</main>

	<footer>
		<label>
			<IconChevronUp size={24} strokeWidth={2} />
			<IconChevronDown size={24} strokeWidth={2} />
			<input type="checkbox" name="playerLayout" bind:this={playerLayoutCheckbox} />
		</label>
		<Player />
	</footer>
</div>

<style>
	.layout {
		display: grid;
		height: 100vh;
	}
	header {
		/* padding: 1rem 1rem 0; */
		padding: 0.5rem 1rem 0.5rem;
		background: var(--color-bg-secondary);
		/* background: yellow; */
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.5rem;
		font-size: var(--font-size-small);
		border-bottom: 1px solid var(--color-border-tertiary);
		a:last-of-type {
			margin-right: auto;
		}
	}
	main {
		overflow-y: auto;
	}
	footer {
		position: fixed;
		left: 1rem;
		right: 1rem;
		bottom: 0;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-tertiary);
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
	}
	footer label {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
	}
	footer input {
		/* visually  hide so you can still get keyboard ux */
		position: absolute;
		left: -999px;
	}

	footer label:not(:hover) :global(svg) {
		opacity: 0.8;
	}

	footer label :global(svg) {
		display: none;
	}

	footer label :global(svg path) {
		stroke: var(--color-text-primary);
	}

	/* Toggled state */
	footer:has(input:checked) label {
		bottom: auto;
	}
	footer:has(input:checked) {
		left: 0;
		right: 0;
		height: 100%;

		& :global(svg:first-of-type) {
			display: none;
		}
		& :global(svg:last-of-type) {
			display: block;
			margin-top: 0.5rem;
			margin-left: 0.5rem;
		}
	}
</style>
