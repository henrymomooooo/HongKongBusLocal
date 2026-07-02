# Design: KMB Null ETA Display Fix

## Context & Problem
When the KMB API returns `eta: null` for a route or stop (e.g. Route 234D when no live ETAs or active departures exist for the route), `getRelativeTime` in `bus.html` and `getRelativeCountdownTime` in `bus_all.html` incorrectly treat `!eta` as a "Scheduled" bus (`t('scheduled')` -> "預定班次" / "Scheduled").

Actual API behavior:
- Real scheduled departures provide a valid ISO timestamp in `eta` (e.g. `"2026-07-02T15:08:00+08:00"`) with `rmk_tc: "原定班次"`.
- Routes with no available ETA provide `eta: null` and `rmk_tc: ""`.

Displaying "預定班次" when `eta` is `null` gives the user the impression that a bus is running on schedule when in fact no ETA is available.

## Proposed Solution
Update the helper functions in `bus.html` and `bus_all.html` so that a `null` or empty ETA timestamp resolves to `t('noETA')` ("暫無預計到站時間" / "No ETA").

### File Changes

1. `bus.html`
   - In `getRelativeTime(s)`:
     ```javascript
     function getRelativeTime(s) { 
         if (!s) return t('noETA'); 
         const d = Math.floor((new Date(s.replace(' ', 'T')) - new Date()) / 60000); 
         return d <= 0 ? `0 ${t('min')}` : `${d} ${t('min')}`; 
     }
     ```

2. `bus_all.html`
   - In `getRelativeCountdownTime(targetTimeStr, nowObj, locale)`:
     ```javascript
     if (!targetTimeStr) return locale === 'tc' ? '暫無預計到站時間' : 'No ETA';
     ...
     if (isNaN(target.getTime())) return locale === 'tc' ? '暫無預計到站時間' : 'No ETA';
     ```

## Success Criteria & Verification
- When querying KMB route 234D, the dashboard displays "暫無預計到站時間" (or "No ETA" in English) instead of "預定班次".
- Normal routes with valid timestamps continue to display relative minute/second countdowns properly.
