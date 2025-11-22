# Changelog

All notable changes to the Antigravity Discord RPC extension will be documented in this file.

## [0.0.9] - 2025-11-22

### Changed
- Adjusted conversation polling interval from 2s to 3.33s to optimize performance

## [0.0.8] - 2025-11-22

### Changed
- Improved status accuracy: now uses the nearest `## Section Header` for the task name instead of the file title
- This ensures the status updates as you move through different sections of a task, even if the main title isn't updated

## [0.0.7] - 2025-11-21

### Fixed
- Fixed issue where status would get "locked" to an old task indefinitely
- Added 5-minute timeout: status now reverts to "Idle" if agent hasn't been active recently

## [0.0.6] - 2025-11-21

### Added
- Gallery banner with Antigravity-themed dark colors
- Explicit note in README that this is Antigravity-specific

### Changed
- Improved description to emphasize "Antigravity" and "AI agent" functionality
- Updated README to clarify platform requirements

## [0.0.5] - 2025-11-21

### Added
- Author attribution (A-Gift-Of-Flame)
- CHANGELOG.md to track version history

### Changed
- Improved metadata for better discoverability

## [0.0.3] - 2025-11-21

### Added
- Expanded keywords for better search visibility (11 keywords total)
- MIT License file
- Comprehensive README with features and usage instructions

### Changed
- Updated description to be more SEO-friendly
- Improved metadata in package.json
- Version bump from 0.0.2 to 0.0.3

## [0.0.2] - 2025-11-21

### Added
- Initial Open VSX marketplace publication
- GitHub repository integration
- Repository metadata (bugs, homepage, license)

### Changed
- Updated extension to use dynamic conversation tracking
- Fixed persistent timer (no longer resets every 15 seconds)

## [0.0.1] - 2025-11-20

### Added
- Initial release
- Dynamic Discord Rich Presence for Antigravity
- Real-time agent activity tracking across all conversations
- Automatic detection of active conversation
- Task name and status display in Discord
- Fallback to editor information when agent is idle
