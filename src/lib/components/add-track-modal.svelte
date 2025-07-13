<script>
	import {pg} from '$lib/db'
	import Modal from '$lib/components/modal.svelte'
	import {IconAdd} from 'obra-icons-svelte'

	let showModal = $state(false)
	let channelId = $state()

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.target?.tagName === 'PGLITE-REPL' || event.target?.tagName === 'INPUT') return
		if (event.key === 'c' && !event.metaKey && !event.ctrlKey) showModal = true
	}

	// Listen to app state updates and update UI.
	pg.live.query('select * from app_state where id = 1', [], (res) => {
		const appState = res.rows[0]
		channelId = appState?.channels ? appState.channels[0] : undefined
	})

	function submit(event) {
		const track = event.detail.data
		console.log('Created remote track', track)
		// @todo pull tracks or insert directly
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if channelId}
	<button onclick={() => (showModal = true)}>
		<IconAdd /> Track
	</button>
{:else}
	<a class="btn" href="/login">
		<IconAdd /> Track
	</a>
{/if}

<Modal bind:showModal>
	{#snippet header()}
		<h2>Add track</h2>
	{/snippet}
	{#if channelId}
		<r4-track-create channel_id={channelId} onsubmit={submit}></r4-track-create>
	{:else}
		<p><a href="/login">Sign in</a> first, please.</p>
	{/if}

	<!--
	<form hidden>
		<label for="url">URL</label>
		<input type="url" required name="url" id="url" placeholder="Paste in a YouTube URL..." />

		<label for="description">Description</label>
		<input
			type="text"
			required
			name="description"
			id="description"
			placeholder="Add description..."
		/>
		<hr />
		<button type="submit">Create track</button>
	</form>
	-->
</Modal>
