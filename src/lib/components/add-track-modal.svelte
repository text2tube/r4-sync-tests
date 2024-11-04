<script>
	import Modal from '$lib/components/modal.svelte'

	let showModal = $state(false)

	/** @param {KeyboardEvent} event */
	function handleKeyDown(event) {
		if (event.key === 'c') showModal = true
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<button onclick={() => (showModal = true)}>Add track</button>

<Modal bind:showModal>
	{#snippet header()}
		<h2>@TODO TEST › Add Track</h2>
	{/snippet}
	<form>
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
</Modal>

<style>
	form {
		display: flex;
		flex-flow: column;
		/* gap: 0.2rem; */
	}
	input[type='text'],
	input[type='url'] {
		min-height: 2rem;
		padding: 0 0.3rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-tertiary);
		border-radius: var(--border-radius);

		border: 0;
	}
	label {
		color: var(--color-text-tertiary);
		/* display: none; */
	}
	input + label {
		margin-top: 1rem;
		margin-bottom: 0.2rem;
	}
	button[type='submit'] {
		margin-left: auto;
		/* bit bigger? */
		padding-left: 1rem;
		padding-right: 1rem;
		min-height: 2rem;
		letter-spacing: 0.01em;
	}
</style>
