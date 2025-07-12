# Search Feature

The /search page doubles as a command palette, accessible globally via Cmd+K. Type to search across channels and tracks, or use prefixes to navigate and execute commands. The search input uses native HTML5 datalist autocomplete populated with channel slugs and available commands.

## How It Works

Pressing Cmd+K anywhere in the app navigates to /search and focuses the input. The search executes different actions based on what you type. Channel navigation uses @ prefixes like @good-time-radio, while commands use / prefixes like /settings or /toggle-theme. You can also type bare words like "settings" which works as a shortcut to common pages.

The autocomplete suggestions come from a datalist element that loads all channel slugs from the database plus the available commands. As you type, the browser's native autocomplete shows matching options. When you press Enter, the smart execution logic determines whether to navigate to a page, execute a command, or perform a regular search.

## Smart Execution Flow

The executeCommand function tries different patterns in order. First it checks for command prefixes like /settings or /toggle-theme and runs the corresponding function. Then it looks for channel navigation with @ prefixes and navigates to that channel page. It also handles bare shortcuts like typing "settings" to go directly to the settings page. If none of these patterns match, it falls back to regular search functionality.

## Performance Considerations

Database queries only trigger for search terms longer than 2 characters to avoid expensive queries on single characters. The search is debounced to prevent rapid-fire queries as you type. After successful command execution, both the search query and results are cleared to avoid showing "No results found" messages.

## Files

The main search interface lives in src/routes/search/+page.svelte which handles the input, autocomplete, and smart execution logic. The global Cmd+K shortcut is registered in src/routes/+layout.svelte. Command functions like toggleTheme and toggleQueuePanel are defined in src/lib/api.js and imported into the search page to avoid code duplication.

## Integration Points

The search page reuses existing database patterns and live queries for reactive updates. Channel data comes from the local PGlite database while commands integrate with the app's existing state management through the app_state table. The autocomplete loads all channel slugs on mount to populate suggestions without requiring additional database calls during typing.
