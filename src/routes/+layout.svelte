<script>
	import '../styles/style.css'
	import {initDb} from '$lib/db'
	import Player from '$lib/components/player.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import InternetIndicator from '$lib/components/internet-indicator.svelte'
	import {IconChevronUp, IconChevronDown} from 'obra-icons-svelte'
	import '@radio4000/components'

	const {children} = $props()

	let preloading = $state(true)

	/** @type {HTMLInputElement|undefined} */
	let playerLayoutCheckbox = $state()

	$effect(() => {
		initDb()
			.then(() => {
				preloading = false
				// pg.live.query('select * from app_state', [], (res) => {
				// 	console.log('layout queried app_state', res.rows[0])
				// })
			})
			.catch((err) => {
				console.error('Failed to initialize database:', err)
				preloading = false
			})
	})

	/**
	 * Close the player overlay, if open, on escape key press.
	 * @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.key === 'Escape' && playerLayoutCheckbox?.checked) playerLayoutCheckbox.click()
	}

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	// $effect(() => {
	// 	window.addEventListener('beforeunload', async (event) => {
	// 		console.log('maybe close pglite?')
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
		<a href="/settings">Settings</a>
		<a href="/playground/syncthing">Syncthing</a>
		<InternetIndicator />

		{#if !preloading}
			<AddTrackModal />
			<hr />
			<ThemeToggle />
		{/if}
	</header>

	<main>
		{#if preloading}
			<center>
				<p>Preparing R4&hellip;</p>
			</center>
		{:else}
			{@render children()}
		{/if}
	</main>

	<footer>
		<label class="playerToggle">
			<IconChevronUp size={24} strokeWidth={2} />
			<IconChevronDown size={24} strokeWidth={2} />
			<input type="checkbox" name="playerLayout" bind:this={playerLayoutCheckbox} />
		</label>
		{#if !preloading}
			<Player />
		{/if}
	</footer>
</div>

<style>
	.layout {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
	}
	header {
		padding: 0.5rem 1rem 0.5rem;
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 1rem;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border-tertiary);

		> a {
			font-size: var(--font-size-small);
			line-height: 2rem;
			text-decoration: none;
		}
	}
	main {
		overflow-y: auto;
		/* space for fixed, bottom player */
		padding-bottom: 10rem;
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
		/* large enough to cover the avatar and some title */
		width: calc(100% / 3);
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
		width: 100%;
		bottom: auto;
	}
	footer:has(input:checked) {
		left: 0;
		right: 0;
		height: 100%;

		@media (min-width: 800px) {
			left: 30%;
		}

		& :global(.playerToggle svg:first-of-type) {
			display: none;
		}
		& :global(.playerToggle svg:last-of-type) {
			display: block;
			margin-top: 0.5rem;
			margin-left: 0.5rem;
		}
	}
</style>
