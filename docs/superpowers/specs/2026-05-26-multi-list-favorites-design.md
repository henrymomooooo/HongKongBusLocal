# Multi-List Favorites Design - HK Bus Arrivals

**Goal:** Allow users to organize their favorite bus stops into multiple custom groups (e.g., "Outgoing", "Back Home") with the ability to create, rename, reorder, and delete groups.

## 1. Data Model Changes

### New ObjectStore: `favorite_groups`
- **KeyPath:** `id` (Auto-increment)
- **Fields:**
    - `id`: int
    - `name_tc`: string
    - `name_en`: string
    - `sortOrder`: int

### Updated ObjectStore: `favorites`
- **New Field:** `groupId` (int) - Links the favorite to a record in `favorite_groups`.
- **Migration:** Existing favorites will be assigned `groupId: 1`.

## 2. Interaction Workflow

### Adding a Favorite
- Tapping the star icon opens a "Save to Group" selection menu.
- Options:
    - List of existing groups.
    - **"+ New Group"**: Prompts for a name, creates the group, and saves the favorite to it.

### Home Screen Display
- Favorites are rendered in sections grouped by `groupId`.
- Each section has a header with the group name.
- **Group Drag & Drop:** Users can drag the group headers to reorder the entire section.
- **Stop Drag & Drop:** Users can reorder stops within a group.

### Group Management
- Each group header includes an "Edit" icon.
- Actions:
    - **Rename:** Update `name_tc` and `name_en`.
    - **Remove:** Deletes the group and all favorites contained within it (after confirmation).

## 3. Localization
- **Default Groups:**
    - TC: `去程`, `回程`
    - EN: `Outgoing`, `Back Home`
- **Actions:**
    - TC: `新增群組`, `重新命名`, `刪除群組`, `儲存至`
    - EN: `Add Group`, `Rename`, `Delete Group`, `Save to`

## 4. Migration Strategy (v3)
- Check `db_version`. If < 3:
    1. Create `favorite_groups` store.
    2. Seed default groups (ID 1 and 2).
    3. Update all existing `favorites` to have `groupId: 1`.
    4. Update `db_version` and `app_version`.
