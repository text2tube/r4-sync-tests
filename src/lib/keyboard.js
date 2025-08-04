import {createKeybindingsHandler} from 'tinykeys'
import * as api from '$lib/api.js'
import {appState} from '$lib/app-state.svelte'

export const DEFAULT_KEY_BINDINGS = {
	Escape: 'togglePlayerOverlay',
	'$mod+k': 'openSearch',
	'/': 'openSearch',
	k: 'togglePlayPause',
	j: 'toggleQueuePanel'
}

export function initializeKeyboardShortcuts() {
	const keyBindings = appState.shortcuts || DEFAULT_KEY_BINDINGS
	const bindings = {}

	for (const [key, actionName] of Object.entries(keyBindings)) {
		const actionFn = api[actionName]
		if (actionFn) {
			bindings[key] = (event) => {
				if (
					event.target instanceof HTMLInputElement ||
					event.target instanceof HTMLTextAreaElement ||
					event.target instanceof HTMLSelectElement
				)
					return
				actionFn(event)
			}
		}
	}

	const handler = createKeybindingsHandler(bindings)
	window.addEventListener('keydown', handler)
	return () => window.removeEventListener('keydown', handler)
}
