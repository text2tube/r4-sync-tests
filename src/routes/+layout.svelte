<script>
	import '../styles/style.css'
	import 'leaflet/dist/leaflet.css'
	import {pg} from '$lib/db'
	import {stopBroadcasting} from '$lib/broadcast'
	import LayoutFooter from '$lib/components/layout-footer.svelte'
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
	import HeaderSearch from '$lib/components/header-search.svelte'
	import {toggleQueuePanel, subscribeToAppState} from '$lib/api'
	import {goto} from '$app/navigation'
	import '@radio4000/components'
	import {logger} from '$lib/logger'
	import {page} from '$app/state'
	const log = logger.ns('layout').seal()

	const {data, children} = $props()

	let chatPanelVisible = $state(false)

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
			log.log('beforeunload_closing_db')
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
		<a href="/" class:active={page.route.id === '/'}>
			{#if preloading}
				R0
			{:else}
				<TestCounter />
			{/if}
		</a>
		<HeaderSearch />
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

		{#if chatPanelVisible}
			<DraggablePanel title="R4 Chat" panelId="chat">
				<LiveChat />
			</DraggablePanel>
		{/if}
	</div>

	<LayoutFooter {appState} {preloading} {playerLoaded} />
</div>

<style>
	.layout {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;

		header,
		footer {
			background: light-dark(var(--gray-2), var(--gray-3));
		}
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		overflow: hidden;
	}

	.content:global(:has(aside)) {
		grid-template-columns: 1fr minmax(460px, 25vw);
	}

	.scroll {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
	}

	.row {
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.2rem;
	}

	.layout header {
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

		:global(.live-broadcasts) {
			margin-right: 0.5rem;
		}
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}
	}
</style>
