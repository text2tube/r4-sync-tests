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
	import {appState, initAppState, persistAppState} from '$lib/app-state.svelte'
	import '@radio4000/components'
	import {logger} from '$lib/logger'
	import {page} from '$app/state'
	import {onMount} from 'svelte'
	import {toggleQueuePanel} from '$lib/api'

	const log = logger.ns('layout').seal()

	const {data, children} = $props()

	let skipPersist = $state(true)
	let chatPanelVisible = $state(false)
	const playerLoaded = $derived(appState.playlist_track)
	const preloading = $derived(data.preloading)

	onMount(async () => {
		await initAppState()
		skipPersist = false
	})

	$effect(() => {
		if (skipPersist) return
		// Take a snapshot to track all property changes
		$state.snapshot(appState)
		persistAppState().catch((err) => {
			console.error('Failed to persist app state from effect:', err)
		})
	})

	// "Close" the database on page unload. I have not noticed any difference, but seems like a good thing to do.
	$effect(() => {
		const handler = async () => {
			log.log('beforeunload_closing_db')
			// event.preventDefault()
			stopBroadcasting()
			appState.is_playing = false
			await pg.close()
		}
		window.addEventListener('beforeunload', handler)
		return () => window.removeEventListener('beforeunload', handler)
	})
</script>

<AuthListener />
<KeyboardShortcuts />

<div class={['layout', {asideVisible: appState.queue_panel_visible}]}>
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
			{#if !preloading}
				<LiveBroadcasts />
				<BroadcastControls />
				<AddTrackModal />
				<button onclick={toggleQueuePanel} class:active={appState.queue_panel_visible}>
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

		{#if appState.queue_panel_visible}
			<QueuePanel />
		{/if}

		{#if chatPanelVisible}
			<DraggablePanel title="R4 Chat" panelId="chat">
				<LiveChat />
			</DraggablePanel>
		{/if}
	</div>

	<LayoutFooter {preloading} {playerLoaded} />
</div>

<style>
	.layout {
		display: grid;
		grid-template-rows: auto 1fr auto;
		height: 100vh;

		header {
			background: light-dark(var(--gray-2), var(--gray-3));
		}
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		height: 100%;
		overflow: hidden;
	}

	.asideVisible .content {
		grid-template-columns: 1fr minmax(460px, 25vw);
		> :global(aside) {
			display: flex;
		}
	}

	.content > :global(aside) {
		display: none;
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
