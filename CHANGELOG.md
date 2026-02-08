# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Planning Poker Guest Voting** - Fixed critical bug where guest players could not select votes
  - Guest players now correctly identified in `playerInfos` with `isLocal: true`
  - Added `publicKey` to participant sync to prevent duplicate player entries
  - Fixed guest name display with identity fallback
  - Implemented optimistic UI updates for immediate vote feedback
  - Merged local and ledger `votedPlayers` to persist checkmark visibility

### Changed
- **Style Refactoring** - Removed all `<style>` blocks from Vue components
  - Migrated to Tailwind-only styling across 16 Vue components
  - Added custom Tailwind utilities: `glass-dark`, `text-gradient`, `neon-border`, `shadow-neon`, `fade-in`

### Added
- **TypeScript Strict Mode** - Enabled strict mode in all packages
  - Fixed 30+ TypeScript errors across integration, planning-poker, and tic-tac-toe packages

## [0.1.0] - 2026-02-09

### Added
- Initial release of MykoBoard platform
- P2P multiplayer gaming via WebRTC
- Secure wallet integration with cryptographic verification
- Planning Poker game implementation
- Tic-Tac-Toe game implementation
- Galactic Hegemony game (alpha)
- Dynamic lobby with live signaling
- IndexedDB-based local storage
- AWS Free Tier signaling service
