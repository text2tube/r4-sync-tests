<script>
	import {page} from '$app/state'
	import {appState} from '$lib/app-state.svelte'
	import {toggleQueuePanel} from '$lib/api'

	import AddTrackModal from '$lib/components/add-track-modal.svelte'
	import BroadcastControls from '$lib/components/broadcast-controls.svelte'
	import HeaderSearch from '$lib/components/header-search.svelte'
	import Icon from '$lib/components/icon.svelte'
	import LiveBroadcasts from '$lib/components/live-broadcasts.svelte'
	import TestCounter from '$lib/components/test-counter.svelte'
	import ThemeToggle from '$lib/components/theme-toggle.svelte'

	const {preloading} = $props()
</script>

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

<style>
	header {
		display: flex;
		flex-flow: row wrap;
		place-items: center;
		gap: 0.2rem;
		padding: 0.5rem;
		background: light-dark(var(--gray-2), var(--gray-3));
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
</style>
