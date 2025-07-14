// SYNC ARCHITECTURE - Clean minimal context

// DATA SOURCES:
// v2: sdk.channels.readChannels() -> Supabase (modern channels)
// v1: /r5-channels.json -> Firebase export (legacy channels)

// CHANNEL IDENTIFICATION:
// v2 channels: locally stored with firebase_id = NULL
// v1 channels: locally stored with firebase_id = original Firebase ID
// v1 channels only imported if NO v2 channel exists with same slug

// SYNC FLOW:
sync() {
  await Promise.all([
    syncV2(),  // pullChannels() + syncTracks()
    syncV1()   // pullV1Channels() only (no tracks)
  ])
}

// SEPARATE PIPELINES:
syncV2() {
  1. pullChannels()        // v2 channel metadata from SDK
  2. syncTracks()        // v2 tracks for channels that need updates
}

syncV1() {
  1. pullV1Channels()      // v1 channel metadata from JSON (skip if v2 slug exists)
  // No tracks - loaded on-demand when user interacts with v1 channels
}

// FUNCTIONS:
pullChannels()           // v2 channel metadata from SDK
pullV1Channels()         // v1 channel metadata from JSON
pullTracks(slug)         // routes to v1 or v2 based on firebase_id
pullV1Tracks(id, fbId)   // v1 tracks from Firebase REST
syncTracks()             // concurrent track sync for all channels
