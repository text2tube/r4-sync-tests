import {goto} from '$app/navigation'

/** @typedef {object} Shortcut
 * @prop {string} key - The key to listen for
 * @prop {boolean} [meta] - Requires meta/cmd key
 * @prop {boolean} [ctrl] - Requires ctrl key
 * @prop {boolean} [shift] - Requires shift key
 * @prop {boolean} [alt] - Requires alt key
 * @prop {string} description - Description of what the shortcut does
 * @prop {(event: KeyboardEvent) => void} handler - Handler function
 */

/** @type {Shortcut[]} */
const shortcuts = [
	{
		key: 'Escape',
		description: 'Close player overlay',
		handler: () => {
			const playerCheckbox = document.querySelector('input[name="playerLayout"]')
			if (playerCheckbox instanceof HTMLInputElement && playerCheckbox.checked) {
				playerCheckbox.click()
			}
		}
	},
	{
		key: 'k',
		meta: true,
		ctrl: true, // Allow both cmd+k and ctrl+k
		description: 'Open search',
		handler: (event) => {
			event.preventDefault()
			goto('/search').then(() => {
				// Focus the search input after navigation
				setTimeout(() => {
					const searchInput = document.querySelector('input[type="search"]')
					if (searchInput instanceof HTMLInputElement) searchInput.focus()
				}, 0)
			})
		}
	},
	{
		key: 'k',
		description: 'Toggle play/pause',
		handler: () => {
			const ytPlayer = document.querySelector('youtube-video')
			if (ytPlayer) {
				// YouTube video element has paused property
				if (ytPlayer.paused) {
					ytPlayer.play()
				} else {
					ytPlayer.pause()
				}
			}
		}
	}
]

/**
 * Checks if a keyboard event matches a shortcut
 * @param {KeyboardEvent} event
 * @param {Shortcut} shortcut
 * @returns {boolean}
 */
function matchesShortcut(event, shortcut) {
	if (event.key !== shortcut.key) return false

	// For meta/ctrl shortcuts, check if either meta OR ctrl is required
	// and the event has the corresponding modifier
	if (shortcut.meta || shortcut.ctrl) {
		if (!(event.metaKey || event.ctrlKey)) return false
	}

	if (shortcut.shift && !event.shiftKey) return false
	if (shortcut.alt && !event.altKey) return false

	return true
}

/**
 * Main keyboard event handler
 * @param {KeyboardEvent} event
 */
export function handleKeyDown(event) {
	// Skip if user is typing in an input field
	if (
		event.target instanceof HTMLInputElement ||
		event.target instanceof HTMLTextAreaElement ||
		event.target instanceof HTMLSelectElement
	) {
		return
	}

	for (const shortcut of shortcuts) {
		if (matchesShortcut(event, shortcut)) {
			shortcut.handler(event)
			return
		}
	}
}

/**
 * Get all shortcuts for documentation/help
 * @returns {Shortcut[]}
 */
export function getShortcuts() {
	return shortcuts
}
