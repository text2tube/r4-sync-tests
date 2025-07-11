<script>
	import '../styles/style.css'
	import {initDb, pg} from '$lib/db'
	import Player from '$lib/components/player.svelte'
	import QueuePanel from '$lib/components/queue-panel.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'
	import AuthListener from '$lib/components/auth-listener.svelte'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import InternetIndicator from '$lib/components/internet-indicator.svelte'
	import LiveBroadcasts from '$lib/components/live-broadcasts.svelte'
	import {IconChevronUp, IconChevronDown} from 'obra-icons-svelte'
	import {setupBroadcastSync, stopBroadcasting} from '$lib/services/broadcast'
	import '@radio4000/components'

	const {children} = $props()

	let preloading = $state(true)
	let queuePanelVisible = $state(true)
	/** @type {import('$lib/types').AppState} */
	let appState = $state({})

	/** @type {HTMLInputElement|undefined} */
	let playerLayoutCheckbox = $state()

	const broadcasting = $derived(!!appState.broadcasting_channel_id)

	$effect(() => {
		initDb()
			.then(() => {
				preloading = false
				pg.live.query(
					'select queue_panel_visible, broadcasting_channel_id from app_state where id = 1',
					[],
					(res) => {
						const state = res.rows[0]
						queuePanelVisible = state?.queue_panel_visible ?? false
						appState = state || {}
					}
				)
				setupBroadcastSync()
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

	function toggleQueuePanel() {
		const newVisible = !queuePanelVisible
		pg.sql`UPDATE app_state SET queue_panel_visible = ${newVisible} WHERE id = 1`
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

<AuthListener />

<div class="layout">
	<header class="row">
		<a href="/">
			{#if preloading}
				R0
			{:else}
				<TestCounter />
			{/if}
		</a>

		<div class="row right">
			{#if !preloading}
				<LiveBroadcasts />
				{#if broadcasting}
					<button onclick={() => stopBroadcasting()}> 🔴 Stop Broadcasting </button>
				{/if}
			{/if}
			<!-- <a href="/playground/syncthing">Syncthing</a> -->
			<InternetIndicator />
			{#if !preloading}
				<AddTrackModal />
				<button onclick={toggleQueuePanel}>
					{queuePanelVisible ? 'Hide' : 'Show'} Queue
				</button>
				<ThemeToggle />
			{/if}
			<a href="/settings">Settings</a>
		</div>
	</header>

	<div class="content">
		<main class="scroll">
			{#if preloading}
				<center>
					<p>Preparing R4&hellip;</p>
				</center>
			{:else}
				{@render children()}
			{/if}
		</main>

		{#if !preloading && queuePanelVisible}
			<QueuePanel />
		{/if}
	</div>

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
		grid-template-rows: auto 1fr auto;
		height: 100vh;
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		overflow: hidden;
	}

	.content:global(:has(aside)) {
		grid-template-columns: 1fr minmax(400px, 25vw);
	}

	header,
	footer {
		background: light-dark(var(--gray-2), var(--gray-3));
	}

	.row {
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.5rem;
	}

	header {
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-5);

		.right {
			margin-left: auto;
		}

		a {
			font-size: var(--font-size-small);
			line-height: 2rem;
			text-decoration: none;
		}
	}

	main {
		/* space for fixed, bottom player */
		padding-bottom: 10rem;
	}

	.queue-aside {
	}

	/* Mobile: hide aside */
	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}

		.queue-aside {
			display: none;
		}
	}

	footer {
		position: fixed;
		left: 1.5rem;
		right: 1.5rem;
		bottom: 1rem;

		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
	}
	footer .playerToggle {
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
		stroke: var(--gray-12);
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
