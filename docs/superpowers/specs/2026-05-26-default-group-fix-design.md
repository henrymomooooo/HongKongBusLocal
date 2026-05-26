# Default Group Fix Design - HK Bus Arrivals

**Goal:** Ensure that the "Outgoing" and "Back Home" groups are always visible, even when empty, and prevent them from being deleted.

## 1. Requirements
- **Always Visible:** The default groups (ID 1: Outgoing, ID 2: Back Home) must always appear on the home screen, even if they contain no favorites.
- **Non-Deletable:** Users should not be able to delete these two core groups.
- **Self-Healing:** If a user is missing these groups (due to a previous version's logic or manual deletion), the app should recreate them on startup.

## 2. Implementation Strategy

### A. Rendering Logic (`renderFavorites`)
- Modify the loop that renders groups.
- If `group.id === 1` or `group.id === 2`, render it even if `groupFavs.length === 0`.
- For other groups (custom groups), keep the current logic (only render if not empty).

### B. Group Management (`handleGroupEditClick`)
- In the edit handler, check if the `groupId` is 1 or 2.
- If it is, the "Delete" option should be disabled or blocked.
- We can change the confirmation message or simply prevent the `deleteGroup` call for these IDs.

### C. Initialization (`checkMigrations`)
- The current logic only seeds groups if `dbVer < 3`.
- We should make it more robust: check if groups 1 and 2 exist, and if not, create them regardless of the version.

### D. UI/UX
- Hide the delete option (or the entire gear icon, or just the delete confirmation) for groups 1 and 2 to communicate they are permanent.
- Since the user suggested they "Cannot be deleted", we'll restrict the action in `handleGroupEditClick`.

## 3. Detailed Changes
- **`renderFavorites`:** Remove `if (groupFavs.length > 0)` constraint for IDs 1 and 2.
- **`handleGroupEditClick`:** Add a check `if (groupId === 1 || groupId === 2)` and skip the delete flow.
- **`BusDB.checkMigrations`:** Add a check to verify existence of IDs 1 and 2.
