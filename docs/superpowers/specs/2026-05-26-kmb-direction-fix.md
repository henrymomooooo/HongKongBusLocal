# KMB Direction Filtering Bug Fix - HK Bus Arrivals

**Goal:** Fix the bug where KMB ETA results for certain routes (like A38) show both inbound ("I") and outbound ("O") directions instead of filtering for the correct one.

## 1. Problem Analysis
- **Symptom:** The user reports that KMB route A38 shows both "I" and "O" direction results in the ETA list.
- **Root Cause:** In `BusAPI.getETA()`, the KMB implementation returns the raw response from `/eta/${stopId}/${route}/${serviceType}` without filtering by direction. For some KMB routes/stops, the API returns ETAs for both directions if the stop is served by both.
- **Comparison:** The Citybus (CTB) implementation already filters by `eta.dir`.

## 2. Proposed Fix
- **Modify `BusAPI.getETA()`:**
    - Update the KMB logic to filter the returned ETA array.
    - KMB uses the `dir` field (just like CTB) with values "I" or "O".
    - We need to determine the correct `kmbDir` based on the `bound` or `direction` parameters passed to `getETA()`.

## 3. Implementation Details
- **Direction Mapping:**
    - If `bound` is provided (e.g., from Favorites or selected Route), use it.
    - If only `direction` ("inbound"/"outbound") is provided, map "inbound" -> "I" and "outbound" -> "O".
- **Code Change:**
    ```javascript
    if (company === 'KMB') {
        const data = await this.fetchKMB(`/eta/${stopId}/${route}/${serviceType}`);
        if (!data) return null;
        const kmbDir = bound || (direction === 'inbound' ? 'I' : 'O');
        return data.filter(eta => eta.dir === kmbDir);
    }
    ```

## 4. Verification Plan
- **Manual Test:** 
    1. Open Debug Mode.
    2. Search for route A38.
    3. Select a direction and a stop.
    4. Verify the logs show that the filtered result only contains ETAs for the selected direction.
    5. Check the UI to ensure ETAs match the expected direction.
