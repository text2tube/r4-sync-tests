# R5 exports 15th of July 2025

Exports from lib/api.js, sync.js, broadcast.js

// DATABASE
- migrateDb() - initializes the database
- dropDb() - resets the database
- exportDb() - exports the database

// DATA
- findV1TracksByChannel(id) - finds v1 tracks by channel id
- getChannelsWithTrackCounts() - aggregates channel statistics
- getTrackWithChannel(trackId) - retrieves track with associated channel data
- needsUpdate(slug) - track timestamp comparison for sync necessity
- pullChannel(slug) - fetches single channel data
- pullChannels(options) - retrieves channel metadata from remote
- pullTracks(slug) - downloads all tracks for specified channel
- pullV1Channels() - pulls v1 channels
- pullV1Tracks(channelId, channelFirebaseId, pg) - pulls v1 tracks
- searchChannelTracks(channelId, searchTerm) - filters tracks by text search
- subscribeToAppState(callback) - establishes reactive app state subscription
- sync(options) - complete sync orchestrator
- syncToBroadcast(broadcast) - synchronizes player to remote broadcast state

// AUTH
- checkUser() - validates authentication and syncs user channels

UI/PLAYER
- closePlayerOverlay() - manipulates player ui state
- openSearch() - navigates to search with input focus
- togglePlayPause() - controls youtube player state
- toggleQueuePanel() - shows/hides queue interface
- toggleTheme() - switches between light and dark modes
- addPlayHistory({currentTrack, newTrack, endReason, startReason}) - records playback analytics
- addToPlaylist(trackIds) - appends tracks to current playlist
- playChannel({id, slug}) - loads channel tracks and starts playback
- playTrack(id, endReason, startReason) - updates current track with history tracking

BROADCAST
- joinBroadcast(channelId) - syncs local player to remote broadcast
- leaveBroadcast() - disconnects from broadcast listening
- readBroadcastsWithChannel() - fetches active broadcasts with channel metadata
- setupBroadcastSync() - establishes reactive sync between local state and remote broadcasts
- startBroadcasting(channelId) - enables broadcast mode for user channel
- stopBroadcastSync() - tears down sync subscription
- stopBroadcasting() - disables broadcast mode

KEYBOARD SHORTCUTS
- initializeKeyboardShortcuts() - initializes the keyboard shortcuts
- loadKeyBindings() - loads the key bindings
- saveKeyBindings(keyBindings) - saves the key bindings
