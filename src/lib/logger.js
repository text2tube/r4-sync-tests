import adze, {setup} from 'adze'

/** Access logs via store.logs */
export const store = setup({
	cache: true
})

/**
 * Usage
 * logger.info('greetings')
 * logger.warn('oh no')
 * logger.error('nop')
 *
 * Namespaced usage:
 * const slog = logger.ns('sync').seal()
 * slog.log('start') --> info #sync start
 */
// export const logger = adze.withEmoji.seal()
export const logger = adze.seal()
