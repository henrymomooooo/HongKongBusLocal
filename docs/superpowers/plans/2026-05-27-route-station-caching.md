# Route Station Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement database-level caching for bus route station lists to provide instant loading.

**Architecture:** Add a new `route_stops` store in IndexedDB and modify `BusAPI.getStops` to prioritize cached data.

**Tech Stack:** Vanilla JavaScript (IndexedDB), HTML.

---

### Task 1: Database v4 Upgrade

**Files:**
- Modify: `index.html` (Update `BusDB` to v4)

- [ ] **Step 1: Increment DB_VERSION and update onupgradeneeded**
```javascript
// Change to 4
DB_VERSION: 4,

// In onupgradeneeded loop
['routes', 'favorites', 'metadata', 'favorite_groups', 'route_stops'].forEach(s => {
    if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { 
        keyPath: (s === 'routes' || s === 'route_stops' ? 'id' : (s === 'favorites' ? 'favId' : (s === 'favorite_groups' ? 'id' : 'key'))), 
        autoIncrement: (s === 'favorites' || s === 'favorite_groups') 
    });
});
```

### Task 2: Implement Caching Logic in `getStops`

**Files:**
- Modify: `index.html` (Update `BusAPI.getStops`)

- [ ] **Step 1: Add cache check and storage logic**
Update the function to calculate a cache ID and check `BusDB` before calling API.

```javascript
            async getStops(co, route, direction, type, rid) {
                const dir = direction === 'outbound' ? 'outbound' : 'inbound';
                const cacheId = `${co}_${route}_${dir}_${type || 1}_${rid || ''}`;
                
                // 1. Check Cache
                const cached = await BusDB.get('route_stops', cacheId);
                const isRecent = cached && (Date.now() - cached.last_updated < 86400000); // 24 hours
                
                if (isRecent) return cached.stops;

                // 2. Fetch from API (existing logic...)
                let stops = [];
                if (co === 'KMB') { /* fetch... */ }
                else if (co === 'CTB') { /* fetch... */ }
                else if (co === 'NLB') { /* fetch... */ }

                // 3. Save to Cache
                if (stops && stops.length > 0) {
                    await BusDB.put('route_stops', { id: cacheId, stops, last_updated: Date.now() });
                }
                return stops;
            },
```

### Task 3: Verification

- [ ] **Step 1: Test Initial Load**
Search for a new route. Verify that it still loads from the API (check Debug Console logs).

- [ ] **Step 2: Test Cached Load**
Search for the SAME route again (or go back and click it again). Verify that the stop list appears **instantly** and NO new API requests for `/route-stop/` appear in the Debug Console.

- [ ] **Step 3: Test Multi-Direction Cache**
Swap directions for the same route. Verify that each direction is cached independently.
