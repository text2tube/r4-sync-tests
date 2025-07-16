R5 exports

15th of July 2025.

Exports from lib/api.js, sync.js, broadcast.js

- addPlayHistory({currentTrack, newTrack, endReason, startReason}) - records playback analytics
- addToPlaylist(trackIds) - appends tracks to current playlist
- checkUser() - validates authentication and syncs user channels
- closePlayerOverlay() - manipulates player ui state
- dryRun(options) - preview sync operations without execution
- ensureTrackAvailable(trackId) - guarantees track exists locally, syncing if needed
- getChannelsWithTrackCounts() - aggregates channel statistics
- getTrackWithChannel(trackId) - retrieves track with associated channel data
- joinBroadcast(channelId) - syncs local player to remote broadcast
- leaveBroadcast() - disconnects from broadcast listening
- needsUpdate(slug) - timestamp comparison for sync necessity
- needsUpdateBatch(channelIds) - batch version of needsUpdate
- openSearch() - navigates to search with input focus
- playChannel({id, slug}) - loads channel tracks and starts playback
- playTrack(id, endReason, startReason) - updates current track with history tracking
- pullChannel(slug) - fetches single channel data
- pullChannels(options) - retrieves channel metadata from remote
- pullTracks(slug) - downloads all tracks for specified channel
- pullV1Channels() - pulls v1 channels
- pullV1Tracks(channelId, channelFirebaseId, pg) - pulls v1 tracks
- findV1TracksByChannel(id) - finds v1 tracks by channel id
- readBroadcastsWithChannel() - fetches active broadcasts with channel metadata
- searchChannelTracks(channelId, searchTerm) - filters tracks by text search
- setupBroadcastSync() - establishes reactive sync between local state and remote broadcasts
- startBroadcasting(channelId) - enables broadcast mode for user channel
- stopBroadcastSync() - tears down sync subscription
- stopBroadcasting() - disables broadcast mode
- subscribeToAppState(callback) - establishes reactive app state subscription
- sync(options) - complete sync orchestrator
- syncChannel(slug, options) - single channel sync
- syncToBroadcast(broadcast) - synchronizes player to remote broadcast state
- syncTracks(options) - track synchronization with concurrency control
- syncV1() - v1 channel sync pipeline
- syncV2(options) - v2 channel sync pipeline
- togglePlayPause() - controls youtube player state
- toggleQueuePanel() - shows/hides queue interface
- toggleTheme() - switches between light and dark modes
- initDb(reset = true/false) - initializes the database
- exportDb() - exports the database
- migrate() - runs the migrations
- loadKeyBindings() - loads the key bindings
- initializeKeyboardShortcuts() - initializes the keyboard shortcuts
- saveKeyBindings(keyBindings) - saves the key bindings
