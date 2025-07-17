<script>
	import '../styles/style.css'
	import 'leaflet/dist/leaflet.css'
	import {pg} from '$lib/db'
	import {stopBroadcasting} from '$lib/broadcast'
	import Player from '$lib/components/player.svelte'
	import QueuePanel from '$lib/components/queue-panel.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'
	import AuthListener from '$lib/components/auth-listener.svelte'
	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import LiveBroadcasts from '$lib/components/live-broadcasts.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import LiveChat from '$lib/components/live-chat.svelte'
	import DraggablePanel from '$lib/components/draggable-panel.svelte'
	import KeyboardShortcuts from '$lib/components/keyboard-shortcuts.svelte'
	import Icon from '$lib/components/icon.svelte'
	import {toggleQueuePanel, subscribeToAppState} from '$lib/api'
	import '@radio4000/components'
	import {logger} from '$lib/logger'
	import {page} from '$app/state'
	const log = logger.ns('layout').seal()

	const {data, children} = $props()

	let chatPanelVisible = $state(false)
	let playerLayoutCheckbox = $state(false)

	/** @type {import('$lib/types').AppState} */
	let appState = $state({})
	const playerLoaded = $derived(appState.playlist_track)

	// true until the database is initialized.
	const preloading = $derived(data.preloading)

	subscribeToAppState((state) => {
		appState = state
	})

	function toggleChatPanel() {
		chatPanelVisible = !chatPanelVisible
	}

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	$effect(async () => {
		window.addEventListener('beforeunload', async (event) => {
			log.info('beforeunload_closing_db')
			// event.preventDefault()
			await stopBroadcasting()
			await pg.sql`UPDATE app_state SET is_playing = false`
			// await pg.close()
		})
	})
</script>

<AuthListener />
<KeyboardShortcuts />

<div class="layout">
	<header class="row">
		<a href="/">
			{#if preloading}
				R0
			{:else}
				<TestCounter />
			{/if}
		</a>
		<a href="/search" class="btn" class:active={page.route.id === '/search'} title="cmd/ctrl+k"><Icon icon="search" size={20} /></a>
		<!-- <a href="/playground/spam-warrior" class="btn">Spam Warrior</a> -->

		<div class="row right">
			{#if appState}
				<LiveBroadcasts {appState} />
				<BroadcastControls {appState} />
				<AddTrackModal />
			{/if}
			{#if appState}
				<button onclick={toggleQueuePanel} class="btn" class:active={appState.queue_panel_visible}>
					<Icon icon="sidebar-fill-right" size={20} />
				</button>
				<!-- <button onclick={toggleChatPanel}>Chat</button> -->
				<ThemeToggle />
			{/if}
			<a href="/settings" class="btn" class:active={page.route.id === '/settings'}>
				<Icon icon="settings" size={20} />
			</a>
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

		{#if appState?.queue_panel_visible}
			<QueuePanel {appState} />
		{/if}
	</div>

	{#if chatPanelVisible}
		<DraggablePanel title="R4 Chat" panelId="chat">
			<LiveChat />
		</DraggablePanel>
	{/if}

	<footer>
		<label class="playerToggle">
			<Icon icon="chevron-up" size={24} strokeWidth={2} />
			<Icon icon="chevron-down" size={24} strokeWidth={2} />
			<input type="checkbox" name="playerLayout" checked={playerLayoutCheckbox} />
		</label>
		{#if !preloading && playerLoaded}
			<Player {appState} />
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

	.scroll {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.layout {
		header,
		footer {
			background: light-dark(var(--gray-2), var(--gray-3));
		}
	}

	.row {
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.2rem;
	}

	.layout header {
		padding: 0.5rem;
		border-bottom: 1px solid var(--gray-3);

		.right {
			margin-left: auto;
		}

		a {
			font-size: var(--font-size-small);
			line-height: 2rem;
			text-decoration: none;
		}

		:global(.live-broadcasts) {
			margin-right: 0.5rem;
		}
	}

	main {
		/* space for fixed, bottom player */
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}
	}

	footer {
		position: fixed;
		left: 1.5rem;
		right: 1.5rem;
		bottom: 1rem;
		z-index: 10;

		border: 1px solid var(--gray-5);
		border-radius: var(--border-radius);
	}

	footer .playerToggle {
		/* disabled until we make it nice */
		display: none;

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
		top: 0.7rem;
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
