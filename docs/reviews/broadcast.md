# broadcast subsystem report

real-time broadcasting feature for synchronized listening across radio4000 clients

## file: src/lib/broadcast.js

core broadcasting logic managing state synchronization between local and remote databases. handles creating, updating, and destroying broadcast sessions.

exports:

- startBroadcasting(channelId) - enables broadcast mode for user channel
- stopBroadcasting() - disables broadcast mode
- joinBroadcast(channelId) - syncs local player to remote broadcast
- leaveBroadcast() - disconnects from broadcast listening
- setupBroadcastSync() - establishes reactive sync between local state and remote broadcasts
- stopBroadcastSync() - tears down sync subscription

architecture pattern:

- hybrid state management: local app_state tracks user broadcast status, remote broadcast table tracks active sessions
- reactive synchronization via pglite live queries watching app_state changes
- automatic remote broadcast creation/deletion based on local state transitions
- track synchronization requires local availability, triggers channel sync if needed

module-level state concerns:

- global variables lastBroadcastingChannelId, lastTrackId, broadcastSyncChannel create hidden coupling
- no cleanup on module reload scenarios
- broadcast sync setup lacks error recovery mechanisms

## file: docs/broadcast-feature.md

architectural overview explaining broadcast data flow and component responsibilities. clarifies ephemeral nature of broadcast data versus persistent content.

design decisions documented:

- broadcasts stored only remotely, not synced to local database
- 10-minute age limit for joining broadcasts prevents stale sync
- channel_id as primary key enforces single broadcast per channel
- hybrid local/remote state pattern for performance

gaps in documentation:

- error scenarios not covered
- network partition behavior undefined
- cleanup procedures when clients disconnect unexpectedly

## file: src/lib/components/broadcast-controls.svelte

simple ui component for starting and stopping user broadcasts. provides basic validation and youtube player integration.

exports: none, self-contained component

implementation notes:

- direct dom manipulation of youtube-video element creates coupling
- alert() for user feedback not consistent with app patterns
- assumes first channel in user channels array without verification
- no loading states during broadcast operations

potential improvements:

- extract player control logic to dedicated service
- use proper notification system instead of alert
- add loading/disabled states for operations
- validate channel ownership before broadcast start

## file: src/lib/components/live-broadcasts.svelte

complex component managing real-time broadcast discovery and synchronization. handles supabase realtime subscriptions and local state reconciliation.

critical functions:

- updateChannelBroadcastStatus() - syncs remote broadcast states to local channel flags
- real-time subscription handling for broadcast table changes
- automatic cleanup of listening state when broadcasts end
- dynamic import of sync functions for code splitting

reactive patterns:

- effect for initial data load and subscription setup
- cleanup function returned from effect for proper teardown
- state synchronization between remote broadcasts and local channels

architectural concerns:

- deep nesting in realtime event handlers reduces readability
- multiple database queries per broadcast change event
- no debouncing for rapid broadcast state changes
- error handling incomplete for network failures

synchronization complexity:

- bi-directional state sync between local and remote
- race condition potential between local state changes and remote notifications
- cleanup logic scattered across multiple event handlers

refactoring opportunities:

- extract event handler logic to separate functions
- implement retry logic for failed sync operations
- add connection state awareness for offline scenarios
- consolidate database update patterns
- separate concerns of ui state from sync logic

performance considerations:

- frequent database updates on broadcast changes
- lack of batching for multiple simultaneous events
- no caching for repeated broadcast queries
- real-time subscription creates persistent connection overhead

the broadcast subsystem demonstrates solid real-time synchronization concepts while showing typical complexity growth from feature iteration. state management split across multiple layers creates debugging challenges.
