# api subsystem report

central data operations module providing abstraction layer over database and remote services

## file: src/lib/api.js

comprehensive api module handling user management, playlist operations, broadcast synchronization, and ui interactions. serves as primary interface between components and data layer.

architectural patterns:

- automatic sync triggering on data access
- hybrid synchronous/asynchronous operations
- direct dom manipulation for ui controls
- playback analytics with millisecond precision

concerns identified:

- mixed abstraction levels combining high-level business logic with dom queries
- error handling inconsistent across functions (some throw, some return false)
- broadcast age validation hardcoded to 600 seconds
- search implementation uses simple string matching instead of proper text search
- ui manipulation functions tightly coupled to specific element selectors
- no caching layer for frequently accessed data
- transaction boundaries unclear for multi-step operations
- async functions not consistently using proper error propagation

data flow issues:

- playChannel function performs synchronous and asynchronous track loading
- needsUpdate check fires async after tracks already loaded
- playlist operations modify state without atomic guarantees
- theme persistence bypasses normal state management patterns

dom coupling problems:

- youtube-video element accessed directly across multiple functions
- media-controller queries for playback time measurement
- checkbox manipulation in closePlayerOverlay creates fragile dependencies
- setTimeout used for focus management after navigation

performance considerations:

- repeated database queries for track availability checks
- no batching for playlist modifications
- search filters entire result set in memory
- channel track counts computed on every request

refactoring opportunities:

- extract dom manipulation to dedicated ui service layer
- implement proper error handling patterns throughout
- create data access objects for each entity type
- add request debouncing for search operations
- implement caching strategy for static data
- separate business logic from presentation concerns
- standardize async/await usage patterns
- add input validation for all public functions

the api module demonstrates typical evolution from simple data access to complex orchestration layer. separation of concerns would benefit from explicit service boundaries and dependency injection patterns.
