class SyncBackend extends HTMLElement {
	constructor() {
		super()
		this.events = []
	}

	connectedCallback() {
		this.render()
	}

	/** Add new events */
	push(events) {
		console.log('backend push', this.events, events)
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

if (!customElements.get('sync-backend')) {
	customElements.define('sync-backend', SyncBackend)
}
