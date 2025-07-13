<script>
	import {IconSignal} from 'obra-icons-svelte'
	import {startBroadcasting, stopBroadcasting} from '$lib/broadcast'

	const {appState} = $props()

	const userChannelId = $derived(appState.channels?.[0])

	async function start() {
		if (!appState.playlist_track)
			alert('You need to be playing a track to start broadcasting. Play something.')
		else {
			/** @type {HTMLElement & {paused: boolean, play(): void} | null} */
			const player = document.querySelector('youtube-video')
			if (player?.paused) player.play()
			await startBroadcasting(userChannelId)
		}
	}
</script>

{#if userChannelId}
	{#if appState.broadcasting_channel_id}
		<button onclick={() => stopBroadcasting()}>🔴 Stop broadcasting</button>
	{:else}
		<button onclick={start}><IconSignal size={20} strokeWidth={1.7} /> <span>Broadcast</span></button>
	{/if}
{/if}

<style>
	span {
		padding-left: 0.3em;
	}
</style>
