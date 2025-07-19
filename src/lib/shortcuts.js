import {createKeybindingsHandler} from 'tinykeys'
import {pg} from '$lib/db'
import * as api from '$lib/api.js'
import {logger} from '$lib/logger'

const log = logger.ns('shortcuts').seal()

/** @type {import('./types.js').KeyBindingsConfig} */
export const DEFAULT_KEY_BINDINGS = {
	Escape: 'closePlayerOverlay',
	'$mod+k': 'openSearch',
	'/': 'openSearch',
	k: 'togglePlayPause',
	j: 'toggleQueuePanel'
}

/**
 * Load key bindings from database
 * @returns {Promise<import('./types.js').KeyBindingsConfig>} key bindings configuration
 */
export async function loadKeyBindings() {
	try {
		const {rows} = await pg.sql`SELECT shortcuts FROM app_state WHERE id = 1`
		return rows[0]?.shortcuts || DEFAULT_KEY_BINDINGS
	} catch (error) {
		log.error('load_error', error)
		return DEFAULT_KEY_BINDINGS
	}
}

/**
 * Save key bindings to database
 * @param {import('./types.js').KeyBindingsConfig} keyBindings - key bindings configuration to save
 */
export async function saveKeyBindings(keyBindings) {
	await pg.sql`UPDATE app_state SET shortcuts = ${keyBindings} WHERE id = 1`
}

/**
 * Initialize keyboard shortcuts from database and attach to window
 */
export async function initializeKeyboardShortcuts() {
	try {
		const keyBindingsConfig = await loadKeyBindings()

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
		log.log('init', {keyBindingsConfig, bindings})

		return () => {
			window.removeEventListener('keydown', handler)
		}
	} catch (error) {
		log.error('init_error', error)
		return () => {}
	}
}
