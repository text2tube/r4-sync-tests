import gsap from 'gsap'
import {uuid, delay} from '$lib/utils'

class Store {
	constructor() {
		this.mutations = {}
		this.events = []
	}
	mutate(mutation) {
		this.events = this.events.filter((x) => Boolean(x))
		console.log('store mutate', this.events)

		// Add entry to the history
		const event = {
			id: uuid(),
			name: mutation.name,
			args: mutation.args,
			sql: mutation.sql,
			metadata: {
				parentId: null,
				timestamp: new Date().getTime()
			}
		}

		this.events.push(event)
		console.log('store mutate', this.events, {mutation, event})
		// Actually run it, for now we fake it
		// db.sql.query(mutation.sql, mutation.args)
		// this.items.push(mutation.args)
	}
}

function defineMutation(name, schema, sql, options = {localOnly: false}) {
	console.log('defined mutation')
	const mutation = {name, schema, sql, options}
	return mutation //MutationDef<TName, TFrom, TTo>
}

export const addTrack = defineMutation(
	'addTrack',
	{schema: 'todo'}, //Schema.Struct({id: Schema.String, title: Schema.String}),
	`INSERT INTO tracks (id, title) values ($id, $title)`
)

class SyncBackend extends HTMLElement {
	constructor() {
		super()
		this.events = []
	}

	connectedCallback() {
		this.render()
	}

	/** Ignores events with duplicating ID */
	push(events) {
		console.log('bakcned push', this.events, events)
		events.forEach((event) => {
			if (!this.events.find((e) => e.id === event.id)) {
				this.events.push(event)
			}
		})

		this.render()
	}

	pull() {
		return this.events
	}

	render() {
		const el = this
		this.innerHTML = `
            <div>Sync Backend (${this.events.length})</div>
            <ol>${this.events
							.map(
								(e) =>
									`<li>
										${new Date(e.metadata.timestamp).toLocaleTimeString()} - 
										<span class="eventName">${e.name}</span> ${e.args.title}
									</li>
									`
							)
							.join('\n')}</ol>
        `
	}
}

class Device {
	constructor(id) {
		this.id = id
		this.clients = [new Client(0, this.id)]
		// this.addClient()
		this.online = true
	}

	addClient() {
		const client = new Client(this.clients.length, this.id)
		this.clients.push(client)
		this.render()
		return client
	}

	toggleOnline() {
		this.online = !this.online
		this.render()
	}

	render() {
		const el = document.querySelector(`#device-${this.id}`)
		if (!el) return
		const scenario = el.closest('scenario-element')
		el.className = `device ${this.online ? '' : 'offline'}`
		el.innerHTML = `
            <div>Device ${this.id}</div>
            <menu>
                <button onclick="scenario.getDevice(${this.id}).toggleOnline()">
                    ${this.online ? 'Go Offline' : 'Go Online'}
                </button>
                <button onclick="scenario.getDevice(${this.id}).addClient()">
                    Add Client
                </button>
            </menu>
            ${this.clients
							.map(
								(client) => `
                <div class="client" id="client-${client.deviceId}-${client.id}"></div>
            `
							)
							.join('')}
        `
		this.clients.forEach((client) => client.render())
	}
}

class Client {
	constructor(id, deviceId) {
		this.id = id
		this.deviceId = deviceId
		this.liveSync = false
		this.syncInterval = null
		this.mutationCounter = 0
		this.lastSyncedTimestamp = null
		this.store = new Store()
		console.log(this.store.events)
		this.store.mutations = {addTrack}
		// store.mutate(addTrack({id: uuid(), title: 'test track'}))

		// By default LiveStore will only pull new events from the last known head locally available.
		// There is also an option to pull all events from the beginning which can be useful in cases where the history has been rewritten.
	}

	createTrack() {
		console.log(3, this.store.events)
		const now = new Date()
		const mutation = {
			name: 'createTrack',
			args: {
				id: uuid(),
				title: `Track d${this.deviceId}c${this.id}e${++this.store.events.length}`,
				created: now.getTime(),
				updated: now.getTime()
			},
			sql: 'some sql here insert into...'
		}
		this.store.mutate(mutation)
		if (this.liveSync) this.push()
		this.render()
	}

	clearDb() {
		this.store.events = []
		console.log(`[Client ${this.id}] Execute SQL: DELETE FROM tracks`)
		this.render()
	}

	toggleLiveSync() {
		this.liveSync = !this.liveSync
		if (this.liveSync) {
			const device = document.querySelector('scenario-element').getDevice(this.deviceId)
			if (device.online) {
				// Initial sync of existing events
				console.log('background push')
				this.push()
			}
			// Start periodic pull
			this.syncInterval = setInterval(() => {
				console.log('background pull')
				this.pull()
			}, 4000)
		} else {
			// Stop periodic pull
			if (this.syncInterval) {
				clearInterval(this.syncInterval)
				this.syncInterval = null
			}
		}
		this.render()
	}

	pull() {
		const syncBackend = document.querySelector('sync-backend')
		const scenario = document.querySelector('scenario-element')
		const device = scenario.getDevice(this.deviceId)
		if (!device.online) return
		const newEvents = syncBackend
			.pull()
			.filter((e) => !this.store.events.find((existing) => existing.id === e.id))
		console.log(2, this.store.events)
		this.store.events = [...this.store.events, ...newEvents]
		console.log(1, this.store.events)
		this.lastSyncedTimestamp = new Date().getTime()
		this.render()
		visualizeChange(syncBackend, document.querySelector(`#client-${this.deviceId}-${this.id}`))
	}

	push() {
		const syncBackend = document.querySelector('sync-backend')
		const scenario = document.querySelector('scenario-element')
		const device = scenario.getDevice(this.deviceId)
		if (!device.online) return
		const backendEvents = syncBackend.pull()
		const unsynced = this.store.events.filter((local) => !backendEvents.includes(local))
		console.log('push with rebase', {
			timestamp: this.lastSyncedTimestamp,
			backendEvents,
			storeEvents: this.store.events,
			unsynced
		})
		this.store.events = []
		this.pull() // Get up-to-date with backend
		this.store.events.push(...unsynced) // Apply local changes on top
		syncBackend.push(this.store.events)
		this.render()
		visualizeChange(document.querySelector(`#client-${this.deviceId}-${this.id}`), syncBackend)
	}

	render() {
		const el = document.querySelector(`#client-${this.deviceId}-${this.id}`)
		if (!el) return

		// const client = el.closest('scenario-element').getClient(this.deviceId, this.id)

		el.innerHTML = `
            <div>Client ${this.id}</div>
            <div>Local Events (${this.store.events.length})</div>
            <menu>
                <button onclick="window.scenario.getClient(${this.deviceId}, ${this.id}).clearDb()">
                    Clear DB
                </button>
                <button onclick="window.scenario.getClient(${this.deviceId}, ${this.id}).pull()">
                    Pull
                </button>
                <button onclick="window.scenario.getClient(${this.deviceId}, ${this.id}).push()">
                    Push
                </button>
                <button onclick="window.scenario.getClient(${this.deviceId}, ${
									this.id
								}).toggleLiveSync()">
                    ${this.liveSync ? 'Disable' : 'Enable'} Live Sync
                </button>
                <button onclick="window.scenario.getClient(${this.deviceId}, ${
									this.id
								}).createTrack()">
                    Add Track
                </button>
            </menu>
            <ol>${this.store.events
							.map(
								(e) =>
									`<li>${new Date(
										e.metadata.timestamp
									).toLocaleTimeString()} - <span class="eventName">${
										e.name
									}</span> ${e.args.title}</li>`
							)
							.join('\n')}</ol>
        `
	}
}

class ScenarioElement extends HTMLElement {
	constructor() {
		super()
		this.devices = []
		this.addDevice()
	}

	connectedCallback() {
		this.render()
		window.scenario = this
	}

	addDevice() {
		const device = new Device(this.devices.length)
		this.devices.push(device)
		this.render()
		return device
	}

	getDevice(deviceId) {
		return this.devices[deviceId]
	}

	getClient(deviceId, clientId) {
		return this.devices[deviceId]?.clients[clientId]
	}

	reset() {
		const backend = document.querySelector('sync-backend')
		const scenario = document.querySelector('scenario-element')
		backend.events = []
		scenario.devices = []
		backend.render()
		scenario.render()
	}

	render() {
		this.innerHTML = `
			<button onclick="window.scenario.addDevice()">Add Device</button>
			<button onclick="window.scenario.reset()">Reset</button>
			<div class="devices">
				${this.devices
					.map(
						(device) => `
					<div class="device" id="device-${device.id}"></div>
				`
					)
					.join('')}
			</div>
		`

		// Render backend and devices
		// this.querySelector('sync-backend').render();
		// const devicesContainer = this.querySelector(".devices");
		// devicesContainer.innerHTML =
		// .join("");
		this.devices.forEach((device) => device.render())
	}
}

if (!customElements.get('scenario-element')) {
	customElements.define('scenario-element', ScenarioElement)
}

if (!customElements.get('sync-backend')) {
	customElements.define('sync-backend', SyncBackend)
}

function visualizeChange(fromEl, toEl, delay = 0) {
	// Create the floating element
	const floater = document.createElement('div')
	floater.style.cssText = `
    position: fixed;
    width: 12px;
    height: 12px;
    background: #4CAF50;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
  `

	// Get positions
	const fromRect = fromEl.getBoundingClientRect()
	const toRect = toEl.getBoundingClientRect()

	// Start position at fromEl
	floater.style.left = `${fromRect.left}px`
	floater.style.top = `${fromRect.top - 6}px`

	document.body.appendChild(floater)

	console.log('ran', floater)

	gsap
		.timeline()
		// Scale up with bounce
		.fromTo(
			floater,
			{
				autoAlpha: 0,
				scale: 0
			},
			{
				delay,
				scale: 1,
				autoAlpha: 1,
				duration: 1,
				ease: 'back.out(1.7)'
			}
		)
		// Fly to target
		.to(floater, {
			x: toRect.left - fromRect.left,
			y: toRect.bottom - fromRect.top - 6,
			duration: 1,
			ease: 'power3.inOut'
		})
		// Wait and remove
		.to(
			floater,
			{
				scale: 0,
				duration: 0.4,
				onComplete: () => {
					document.body.removeChild(floater)
				}
			},
			'-=0.1'
		)
}
