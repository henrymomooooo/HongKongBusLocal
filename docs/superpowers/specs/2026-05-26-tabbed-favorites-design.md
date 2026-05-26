# Tabbed Favorites Interface Design - HK Bus Arrivals

**Goal:** Transform the vertical grouped favorites list into a tabbed interface where only the active tab's data is retrieved and displayed.

## 1. UI Components

### Favorites Tab Bar
- A new horizontal scrollable container (`#fav-tab-bar`) above the favorites list.
- Each tab represents a record from `favorite_groups`.
- **Styling:** Similar to the Route/Stop search tabs but scoped to the favorites section.
- **Draggable:** Users can drag tabs within the bar to reorder groups (updates `sortOrder` in `favorite_groups`).

### Active Tab Content
- Only the favorites belonging to the `activeGroupId` are rendered.
- **Empty State:** If the active group has no favorites, display: "Add a bus to this group! (搜搜尋路線以加入此群組)"

## 2. Logic & Data Flow

### Initialization
- On load, `activeGroupId` defaults to the ID of the group with the lowest `sortOrder` (typically ID 1).

### Tab Switching
- When a tab is tapped:
    1. Update `activeGroupId`.
    2. Re-render the favorites list.
    3. Trigger ETA refresh *only* for the newly visible buses.

### ETA Retrieval (Optimization)
- Modify `refreshAllETAs()` or create a `refreshActiveTabETAs()` function.
- It will only iterate through favorites where `groupId === activeGroupId`.
- This reduces API calls and battery usage.

## 3. Interaction Workflow

### Adding a Favorite
- Same as before: choose a group from the modal.
- After saving, the app switches to the tab where the favorite was just added (optional, but helpful).

### Management
- The "Edit" (gear) icon will be placed next to the tab name or inside the active tab area.
- Renaming/Deleting works as per the previous Multi-List design, but restricted for IDs 1 and 2.

## 4. Draggable Tabs
- Use the existing pointer event logic to reorder tabs in the horizontal bar.
- Visually, the tab being dragged will follow the finger/cursor.
- On drop, update `sortOrder` for all groups.
