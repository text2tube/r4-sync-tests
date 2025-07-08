<script>
	import {uuid} from '$lib/utils'
	import {createEventFromMutation, visualizeChange} from './syncthing.js'

	let {client, online} = $props()

	let liveSync = $state(false)
	let syncInterval = $state(null)
	let syncSchedule = $state(4000)
	let lastSyncedTimestamp = $state(null)

	let store = $state({events: []})
	let el = $state()

	function mutateStore(mutation) {
		const event = createEventFromMutation(mutation)
		store.events.push(event)
		if (liveSync) sync()
	}

	$effect(() => {
		return () => {
			if (syncInterval) clearInterval(syncInterval)
		}
	})

	function createTrack() {
		console.log('create track', store.events)
		const now = new Date()
		const counter = store.events.length + 1
		const mutation = {
			name: 'createTrack',
			args: {
				id: uuid(),
				title: `Track d${client.deviceId}c${client.id}e${counter}`,
				created: now.getTime()
			},
			sql: 'some sql here insert into...'
		}
		mutateStore(mutation)
	}

	function clearDb() {
		store.events = []
		console.log(`[Client ${client.id}] Execute SQL: DELETE FROM tracks`)
	}

	function toggleLiveSync() {
		liveSync = !liveSync

		if (liveSync) {
			if (online) {
				// Initial sync of existing events
				console.log('initial live sync')
				sync()
			}
			// Start periodic pull
			this.syncInterval = setInterval(() => {
				console.log('live sync')
				sync()
			}, syncSchedule)
		} else {
			// Stop periodic pull
			if (syncInterval) {
				clearInterval(syncInterval)
				syncInterval = null
			}
		}
	}

	function pullRebase() {
		if (!online) return
		console.log('pull rebase')
		const syncBackend = document.querySelector('sync-backend')
		const backendEvents = syncBackend.pull()
		visualizeChange(syncBackend, el)

		// git stash
		const unsynced = store.events.filter((local) => !backendEvents.includes(local))
		store.events = []

		pull()

		// git stash apply
		store.events = [...store.events, ...unsynced]
	}

	function pull() {
		const syncBackend = document.querySelector('sync-backend')
		if (!online) return
		console.log('pull', store.events)
		const newEvents = syncBackend
			.pull()
			.filter((e) => !store.events.find((existing) => existing.id === e.id))
		store.events = [...store.events, ...newEvents]
		lastSyncedTimestamp = new Date().getTime()
		visualizeChange(syncBackend, el)
	}

	function sync() {
		if (!online) return
		console.log('sync')
		pullRebase()
		setTimeout(() => _push(), 500)
	}

	function _push() {
		if (!online) return
		console.log('push', store.events)
		const syncBackend = document.querySelector('sync-backend')
		syncBackend.push(store.events)
		visualizeChange(el, syncBackend)
	}
</script>

<div class="client" bind:this={el}>
	<div>Client {client.id}</div>
	<div>Local Events ({store.events.length})</div>
	<menu>
		<button onclick={clearDb}> Clear DB </button>
		<button onclick={pullRebase}> Pull rebase</button>
		<button onclick={sync}> Sync </button>
		<button onclick={toggleLiveSync}>
			{liveSync ? 'Disable' : 'Enable'} Live Sync
		</button>
		<button onclick={createTrack}> Create Track </button>
	</menu>
	<ol>
		{#each store.events as e}
			<li>
				{new Date(e.metadata.timestamp).toLocaleTimeString()} -
				<span class="eventName">${e.name}</span>
				{e.args.title}
			</li>
		{/each}
	</ol>
</div>
