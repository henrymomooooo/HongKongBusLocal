# KMB Direction Filtering Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly filter KMB ETA results by direction (bound).

**Architecture:** Update `BusAPI.getETA` to apply a filter on the returned data array for KMB, matching the `dir` field with the requested `bound` or `direction`.

**Tech Stack:** Vanilla JavaScript.

---

### Task 1: Fix KMB ETA Filtering

**Files:**
- Modify: `index.html` (Update `BusAPI.getETA`)

- [ ] **Step 1: Apply filtering to KMB ETAs**

Update `BusAPI.getETA` inside the `BusAPI` object:

```javascript
            async getETA(company, stopId, route, serviceType = 1, routeId, bound, direction) {
                if (company === 'KMB') {
                    const data = await this.fetchKMB(`/eta/${stopId}/${route}/${serviceType}`);
                    if (!data) return null;
                    const kmbDir = bound || (direction === 'inbound' ? 'I' : 'O');
                    return data.filter(eta => eta.dir === kmbDir);
                }
                if (company === 'CTB') {
                    // ... existing CTB logic ...
```

### Task 2: Verification

- [ ] **Step 1: Test with Route A38**
Search for A38, select a direction, and open a stop. Verify in the Debug Console that the "RES" logs only contain the correct `dir` ("I" or "O").

- [ ] **Step 2: Verify Favorites**
Ensure that favorites saved with specific directions still show the correct ETAs on the home screen.
