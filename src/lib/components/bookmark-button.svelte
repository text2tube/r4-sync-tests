<script>
	import {addFollower, removeFollower, isFollowing} from '$lib/api'
	import {appState} from '$lib/app-state.svelte'
	import Icon from '$lib/components/icon.svelte'

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
	<Icon icon={isBookmarked ? 'favorite-fill' : 'favorite'} size={24} />
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
