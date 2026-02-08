# MykoBoard Development Backlog

## 🔴 Critical Priority

### TypeScript Strict Mode Compliance
**Status**: 🔴 Blocked  
**Effort**: Large (3-5 days)  
**Assigned**: Unassigned

**Description**:  
Remove all 52+ uses of `any` type across the codebase to comply with Developer skill strict typing requirement.

**Scope**:
- **Core Infrastructure** (src/) - 30 violations
  - `useGameSession.ts` - 13 violations
  - `lib/signaling.ts` - 8 violations
  - `lib/webrtc.ts` - 4 violations
  - `lib/wallet.ts` - 3 violations
  - `lib/sessions.ts` - 2 violations
  - Vue components - 8 violations

- **Packages** - 22 violations
  - `packages/integration` - 8 violations
  - `packages/planning-poker` - 2 violations
  - `packages/galactic-hegemony` - 2 violations

**Acceptance Criteria**:
- [ ] Zero `any` types in all TypeScript files
- [ ] All WebRTC offers/answers have proper interfaces
- [ ] All ledger payloads have typed interfaces
- [ ] All message types have proper type guards
- [ ] All Vue component props are strictly typed
- [ ] Build passes with no type errors
- [ ] All tests pass

**Implementation Approach**:
1. **Phase 1**: Define core interfaces
   - `WebRTCOffer`, `WebRTCAnswer` interfaces
   - `LedgerAction<T>` generic type
   - `GameMessage<T>` generic type
   - `Connection` interface improvements

2. **Phase 2**: Fix core infrastructure
   - Start with `lib/signaling.ts` and `lib/webrtc.ts`
   - Update `useGameSession.ts` with proper Connection types
   - Fix wallet and sessions types

3. **Phase 3**: Fix packages
   - Update `packages/integration` types
   - Fix game-specific types

4. **Phase 4**: Verification
   - Run `bun run build` across all packages
   - Verify no type errors
   - Update tests if needed

**References**:
- [Compliance Review](file:///home/dparadiz/.gemini/antigravity/brain/9113cd35-73fa-4127-8bc6-a728d25d7071/compliance_review.md)
- Developer Skill: Zero use of `any` requirement

---

## 🟡 High Priority

### WebRTC Failure Mode Testing
**Status**: 🟡 Planned  
**Effort**: Medium (2-3 days)  
**Assigned**: Unassigned

**Description**:  
Document and implement testing strategy for WebRTC failure modes as required by QA-PM skill.

**Scope**:
- Signaling loss scenarios
- Network latency handling
- Connection timeout handling
- ICE gathering failures
- Peer disconnection recovery

**Acceptance Criteria**:
- [ ] Document failure modes in `/documentation/testing/webrtc-failure-modes.md`
- [ ] Implement test cases for each failure mode
- [ ] Add retry logic where appropriate
- [ ] Update user-facing error messages

---

## 🟢 Medium Priority

### Unused Variable Cleanup
**Status**: 🟢 Ready  
**Effort**: Small (1 day)  
**Assigned**: Unassigned

**Description**:  
Remove unused variables flagged by TypeScript linter.

**Violations**:
- `createMsg` - useGameSession.ts:8
- `lobbyActor` - useGameSession.ts:18
- `isConnected` - useGameSession.ts:67
- `onBackToGames` - useGameSession.ts:655
- `onBackToDiscovery` - useGameSession.ts:661

**Acceptance Criteria**:
- [ ] All unused variables removed or used
- [ ] No lint warnings for unused variables
- [ ] Build passes

---

## 📋 Backlog

### Type Safety Improvements
- Add proper types for `storedParticipants` (currently missing `publicKey` property)
- Fix `identity.value` type (currently typed as `string` instead of object)

### Performance Optimization
- Audit Vue component tree-shakeability
- Optimize Bun-native API usage

### Documentation
- Add architecture diagrams to README.md
- Document IndexedDB schemas
- Create developer onboarding guide

---

## ✅ Completed

### Documentation Updates
- ✅ Created CHANGELOG.md
- ✅ Updated README.md to reflect Vue 3 architecture
- ✅ Created ADR-003 for publicKey-based guest identification

### Planning Poker Guest Voting Fix
- ✅ Fixed guest player identification
- ✅ Added publicKey to participant sync
- ✅ Implemented optimistic UI updates
- ✅ Fixed duplicate player entries

### Style Refactoring
- ✅ Removed all `<style>` blocks from Vue components
- ✅ Migrated to Tailwind-only styling

### TypeScript Strict Mode Enablement
- ✅ Enabled strict mode in all packages
- ✅ Fixed initial 30+ TypeScript errors
