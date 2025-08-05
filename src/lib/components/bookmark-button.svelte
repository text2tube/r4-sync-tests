<script>
	import {addFollower, removeFollower, isFollowing} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'

	/** @type {{channel: import('$lib/types').Channel, class?: string}} */
	let {channel, class: className = ''} = $props()

	let followerId = $derived(appState.channels?.[0] || 'local-user')
	let isBookmarked = $derived.by(async () => {
		return await isFollowing(followerId, channel.id)
	})

	async function toggleBookmark(event) {
		event.stopPropagation()
		event.preventDefault()

		if (isBookmarked) {
			await removeFollower(followerId, channel.id)
			isBookmarked = false
		} else {
			await addFollower(followerId, channel.id)
			isBookmarked = true
		}
	}
</script>

<button
	onclick={toggleBookmark}
	class={className}
	title={isBookmarked ? 'Unfollow' : 'Follow'}
	aria-label={isBookmarked ? 'Unfollow' : 'Follow'}
>
	{#if isBookmarked}
		<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
			/>
		</svg>
	{:else}
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
			/>
		</svg>
	{/if}
</button>

<style>
	button {
		background: rgba(0, 0, 0, 0.5);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		padding: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}

	button:hover {
		background: rgba(0, 0, 0, 0.7);
	}

	button:focus {
		outline: 2px solid var(--color-accent);
	}

	svg {
		width: 100%;
		height: 100%;
	}
</style>
