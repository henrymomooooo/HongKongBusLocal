# HK Bus Dashboard: Advanced Navigation & Direction Swapping Design

**Goal:** Streamline the user journey by showing KMB variants in search, enabling direct station-list navigation for KMB, and providing an easy "Opposite Direction" swap feature.

## 1. UI Enhancements

### 1.1 Search Results (Front Page)
- **KMB Variants**: KMB routes with `service_type > 1` will display a small badge next to the route number (e.g., "40 [T2]").
- **Layout**: The badge will be styled with a subtle border and the operator's primary color to ensure visibility without clutter.

### 1.2 Station List Header
- **Swap Direction Icon**: A new icon (`fa-right-left` or `⇄`) will be placed next to the route title in the `showStops` view.
- **Visual Feedback**: The icon will only appear if an opposite direction is available for the current route.

## 2. Navigation Logic

### 2.1 Direct-to-Stops (KMB)
- **Behavior**: Clicking a KMB result in the search list will call `showStops(r)` immediately.
- **Rationale**: Since KMB provides distinct records for every bound/service-type combination in the master route list, the intermediate "Direction Selection" screen is redundant for KMB.

### 2.2 Direction Swapping (`swapDirection`)
A new function will handle the logic when the header icon is clicked:
1. **Identify**: Determine the current route's company, number, and direction.
2. **Lookup**: Search the `allRoutes` array for the same route number and company but with the opposite `bound` (for KMB) or `direction` (for CTB).
3. **Transition**: 
   - If exactly one opposite exists: Call `showStops(oppositeRoute)`.
   - If multiple opposites exist (e.g., multiple KMB special return variants): Call `selectRoute(r)` to let the user choose the specific return variant.
   - If no opposite exists (Circular): Hide the swap icon or show a "No return direction" toast.

## 3. Data Integrity
- Ensure `orig_tc` and `dest_tc` are correctly flipped when swapping directions for Citybus.
- Maintain the `targetStopId` clearing when swapping directions to avoid unexpected scrolling to a non-existent stop ID.

## 4. Testing & Verification
- **KMB Search**: Verify clicking a "40" result goes straight to the stop list.
- **Direction Swap**: Verify that swapping on a two-way route (e.g., CTB 10) correctly flips the origin/destination and loads the new stop list.
- **Circular Handling**: Verify the swap icon behaves correctly for circular routes.
