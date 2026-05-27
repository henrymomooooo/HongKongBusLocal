# Route Station Caching Design - HK Bus Arrivals

**Goal:** Improve UX by caching the station list of a bus route in the database, allowing for instant loading of frequently used routes.

## 1. Data Model Changes

### New ObjectStore: `route_stops`
- **KeyPath:** `id`
- **Structure:**
    ```javascript
    {
        id: "co_route_dir_type_rid", // e.g., "KMB_1A_outbound_1"
        stops: [ ... ], // Array of stop objects
        last_updated: 1716800000000 // Timestamp
    }
    ```

## 2. Caching Strategy

### Logic in `BusAPI.getStops`
- **Unique Key:** Generate a unique string using the company, route number, direction, service type, and route ID.
- **Cache Check:**
    1.  Attempt to fetch the entry from `BusDB.route_stops`.
    2.  **Valid Cache (Same Date):** Return the cached stops immediately if the `last_updated` timestamp matches the current calendar date.
    3.  **Background Refresh (Optional):** We can trigger an API fetch in the background if the cache is found but we want to ensure fresh data for tomorrow.
    4.  **No Cache / Expired (Different Date):** Show the loading state, fetch from API, store in DB, and return.

## 3. Implementation Details
- **Database Version:** Increment `BusDB.DB_VERSION` to 4.
- **Migration:** No data migration required; the store will populate naturally as the user searches.
- **Maintenance:** We can add a cleanup task later to remove cache entries older than 30 days if the DB grows too large.

## 4. Expected Benefits
- **Instant UI:** Users will see the station list immediately upon clicking a route they've viewed recently.
- **Bandwidth Saving:** Reduces redundant API calls for static route data.
- **Improved UX:** Eliminates the "Loading stops..." flicker for the user's most-used routes.
