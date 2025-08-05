<script>
	import Modal from '$lib/components/modal.svelte'
	import Icon from '$lib/components/icon.svelte'
	import {appState} from '$lib/app-state.svelte'

	let showModal = $state(false)
	let lastCreatedTrack = $state()

	const channelId = $derived(appState.channels?.length > 0 ? appState.channels[0] : undefined)
	const isSignedIn = $derived(!!appState.user)

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.target?.tagName === 'PGLITE-REPL' || event.target?.tagName === 'INPUT') return
		if (event.key === 'c' && !event.metaKey && !event.ctrlKey) showModal = true
	}

	function submit(event) {
		lastCreatedTrack = event.detail.data
		// @todo insert track into local db. or use pullTracks? Maybe the better option for consistency
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if channelId}
	<button onclick={() => (showModal = true)}>
		<Icon icon="add" size={20}></Icon>
	</button>
{:else if isSignedIn}
	<button onclick={() => (showModal = true)}>
		<Icon icon="add" size={20}></Icon>
	</button>
{:else}
	<a class="btn" href="/login">
		<Icon icon="add" size={20}></Icon>
	</a>
{/if}

<Modal bind:showModal>
	{#snippet header()}
		<h2>Add track</h2>
	{/snippet}

	{#if channelId}
		<r4-track-create channel_id={channelId} onsubmit={submit}></r4-track-create>
	{:else if isSignedIn}
		<p>
			You need to create a channel first. Go to <a
				href="https://radio4000.com"
				target="_blank"
				rel="noopener">radio4000.com</a
			> to create your channel, then come back here.
		</p>
	{:else}
		<p><a href="/login">Sign in</a> first, please.</p>
	{/if}
</Modal>
