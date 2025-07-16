# code report

synchronization subsystem analysis

## file: src/lib/sync.js

primary module for data synchronization between local pglite database and remote radio4000 sources. handles both legacy v1 firebase exports and current v2 supabase channels.

exports:

- pullChannels(options) - retrieves channel metadata from remote
- pullTracks(slug) - downloads all tracks for specified channel
- pullChannel(slug) - fetches single channel data
- needsUpdate(slug) - timestamp comparison for sync necessity
- syncV2(options) - v2 channel sync pipeline
- syncV1() - v1 channel sync pipeline
- sync(options) - complete sync orchestrator
- syncChannel(slug, options) - single channel sync
- dryRun(options) - preview sync operations without execution

architecture notes:

- dual database pattern: remote postgres via supabase, local postgres via pglite
- writes remote, reads local with on-demand pulling
- transaction-based upserts with conflict resolution
- chunked processing for large track sets
- cooperative multitasking with ui thread yielding

improvement suggestions:

- extract constants (CHUNK_SIZE=50, CONCURRENCY=8, toleranceMs=20000) to module top
- consolidate duplicate upsert sql patterns into helper functions
- transaction rollback handling incomplete in pullTracks error cases
- needsUpdate function deeply nested, extract comparison logic
- console.log statements could use consistent logging utility
- magic numbers for tolerance and timeouts need configuration
- pullChannels limit parameter defaults to debugLimit which couples modules
- error handling inconsistent between functions (some throw, some return sets)
- batch processing logic repeated across functions
- channel.busy state not always properly cleaned up on exceptions

performance observations:

- batch queries efficient for large channel sets
- chunking prevents browser blocking during bulk operations
- parallel execution limited by concurrency controls
- timestamp comparison includes millisecond normalization for reliability

## file: docs/sync.md

supplementary documentation describing sync architecture and data flow patterns.

outlines three data sources and channel type distinctions. documents sync method hierarchy and on-demand track loading strategy.

notes discrepancy between documentation and implementation:

- sync flow diagram simplified compared to actual code paths
- v1/v2 channel handling more complex than described

technical debt areas:

- error boundaries could be more granular
- retry logic absent for transient failures
- progress reporting minimal for long-running operations
- dependency injection would improve testability
- sql query builders might reduce string concatenation
- configuration scattered across multiple locations
- logging verbosity not configurable per environment

refactoring opportunities:

- separate concern of channel vs track synchronization
- extract timestamp comparison utilities
- unify error handling patterns
- create sync strategy objects for v1/v2 differences
- implement exponential backoff for network operations
- add sync metrics collection capabilities

the sync subsystem demonstrates solid understanding of distributed data consistency challenges while showing typical evolution artifacts from rapid development cycles.
