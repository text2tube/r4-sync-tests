# R5 exports 15th of July 2025

Exports from lib/api.js, sync.js, broadcast.js

// DATABASE

- migrateDb() - initializes the database
- dropDb() - resets the database
- exportDb() - exports the database

// DATA

- needsUpdate(slug) - track timestamp comparison for sync necessity
- pullChannel(slug) - fetches single channel data
- pullChannels(options) - retrieves channel metadata from remote
- pullTracks(slug) - downloads all tracks for specified channel
- pullV1Channels() - pulls v1 channels
- pullV1Tracks(channelId, channelFirebaseId, pg) - pulls v1 tracks
- sync() - pulls both v1 and v2 channels

// API

- queryChannelsWithTrackCounts() - aggregates channel statistics
- queryTrackWithChannel(trackId) - retrieves track with associated channel data
- readFirebaseChannelTracks(channelId)
- subscribeToAppState(callback) - establishes reactive app state subscription

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
- syncToBroadcast(broadcast) - synchronizes player to remote broadcast state

KEYBOARD SHORTCUTS

- initializeKeyboardShortcuts() - initializes the keyboard shortcuts
- loadKeyBindings() - loads the key bindings
- saveKeyBindings(keyBindings) - saves the key bindings
