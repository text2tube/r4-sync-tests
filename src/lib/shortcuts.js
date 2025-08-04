import {createKeybindingsHandler} from 'tinykeys'
import * as api from '$lib/api.js'
import {logger} from '$lib/logger'
import {appState} from '$lib/app-state.svelte'

const log = logger.ns('shortcuts').seal()

/** @type {import('./types.js').KeyBindingsConfig} */
export const DEFAULT_KEY_BINDINGS = {
	Escape: 'togglePlayerOverlay',
	'$mod+k': 'openSearch',
	'/': 'openSearch',
	k: 'togglePlayPause',
	j: 'toggleQueuePanel'
}

/**
 * Load key bindings from app state
 * @returns {import('./types.js').KeyBindingsConfig} key bindings configuration
 */
export function loadKeyBindings() {
	return appState.shortcuts || DEFAULT_KEY_BINDINGS
}

/**
 * Save key bindings to app state
 * @param {import('./types.js').KeyBindingsConfig} keyBindings - key bindings configuration to save
 */
export function saveKeyBindings(keyBindings) {
	appState.shortcuts = keyBindings
}

/**
 * Initialize keyboard shortcuts from app state and attach to window
 */
export function initializeKeyboardShortcuts() {
	try {
		const keyBindingsConfig = loadKeyBindings()

		// Build tinykeys bindings from config
		/** @type {Record<string, (event: KeyboardEvent) => void>} */
		const bindings = {}

		for (const [key, actionName] of Object.entries(keyBindingsConfig)) {
			/** @type {Function | undefined} */
			const actionFn = /** @type {any} */ (api)[actionName]
			if (actionFn) {
				bindings[key] = (event) => {
					// Skip if user is typing in an input field
					if (
						event.target instanceof HTMLInputElement ||
						event.target instanceof HTMLTextAreaElement ||
						event.target instanceof HTMLSelectElement
					) {
						return
					}
					actionFn(event)
				}
			} else {
				log.warn(`Action '${actionName}' not found for key binding '${key}'`)
			}
		}

		const handler = createKeybindingsHandler(bindings)
		window.addEventListener('keydown', handler)
		// log.log('init', {keyBindingsConfig, bindings})
		return () => {
			window.removeEventListener('keydown', handler)
		}
	} catch (error) {
		log.error('init_error', error)
		return () => {}
	}
}
