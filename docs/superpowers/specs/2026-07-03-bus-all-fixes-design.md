# Design: bus_all.html Bug Fixes (CCTV URL, Stop Favoriting Direction, CTB Swap Direction)

## Context & Problems

1. **CCTV Domain Misspelling**:
   - `bus_all.html` and test scripts use `https://tdcctv.data.gov.hk/`, which is a non-existent domain name causing DNS lookup failures (`ERR_NAME_NOT_RESOLVED`).
   - Official DATA.GOV.HK endpoint is `https://tdcctv.data.one.gov.hk/`.
   - Every CCTV camera feed displays "Camera Offline".

2. **Inbound Stop Favoriting Direction Loss**:
   - When favoriting an Inbound stop from the Stop Search UI (`handleStopRouteFavorite`), `allRoutes.find()` matches the first route entry without checking `bound` (for KMB) and ignores `bound` for CTB where `bound` isn't stored in `allRoutes`.
   - The saved favorite receives `bound: 'O'`, causing navigation to open Outbound stops instead of Inbound.

3. **CTB Swap Direction English Name Undefined**:
   - In `swapDirection` for CTB routes, `curr.orig_en` can be `undefined` for favorite cards. Swapping direction sets `dest_en = curr.orig_en` (`undefined`), resulting in headers like `720 to undefined`.

## Proposed Fixes

### 1. CCTV URL Domain Update
In `bus_all.html`, `test_playwright_e2e.js`, and `test_visual.js`:
- Replace all occurrences of `https://tdcctv.data.gov.hk/` with `https://tdcctv.data.one.gov.hk/`.

### 2. Preserve Bound and Direction in `handleStopRouteFavorite`
In `bus_all.html`:
- Update `handleStopRouteFavorite` so that for KMB, `allRoutes.find` checks `x.bound === bound`.
- Explicitly attach `r.bound = bound` and `r.direction = (bound === 'I' || bound === 'inbound') ? 'inbound' : 'outbound'` on the route object `r` passed to `showGroupSelector(r, s)`.

### 3. Fallback English Names in CTB `swapDirection`
In `bus_all.html`:
- Provide fallbacks for `orig_en` and `dest_en` in `swapDirection`:
  ```javascript
  dest_en: curr.orig_en || curr.dest_en || '',
  orig_en: curr.dest_en || curr.orig_en || ''
  ```

## Success Criteria & Verification
- CCTV camera buttons load live JPEGs from `https://tdcctv.data.one.gov.hk/` without DNS errors.
- Favoriting an Inbound stop (KMB or CTB) correctly saves `bound: 'I'` / `direction: 'inbound'` and opens Inbound stops when clicked from Favorites.
- Swapping direction on a CTB favorite card displays valid English destinations instead of `undefined`.
- Unit tests and E2E tests pass.
