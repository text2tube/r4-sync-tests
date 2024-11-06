<script>
	import {pg} from '$lib/db'
	import Modal from '$lib/components/modal.svelte'

	let showModal = $state(false)
	let channelId = $state()

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.target?.tagName === 'PGLITE-REPL' || event.target?.tagName === 'INPUT') return
		if (event.key === 'c') showModal = true
	}

	$effect(() => {
		// Listen to app state updates and update UI.
		pg.live.query(`select * from app_state where id = 1`, [], (res) => {
			if (res.rows[0].channels) {
				channelId = res.rows[0].channels[0]
			} else {
				channelId = undefined
			}
		})
	})

	function submit(event) {
		const track = event.detail.data
		console.log('Created remote track', track)
		// @todo pull tracks or insert directly
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<button onclick={() => (showModal = true)}>Add track</button>

<Modal bind:showModal>
	{#snippet header()}
		<h2>Add Track ›</h2>
	{/snippet}
	{#if channelId}
		<r4-track-create channel_id={channelId} onsubmit={submit}></r4-track-create>
	{:else}
		<p><a href="/settings">Log in</a> first, please.</p>
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
