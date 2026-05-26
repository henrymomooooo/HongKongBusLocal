# Multi-List Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement grouped favorites with multi-list support, dynamic group creation, and draggable reordering.

**Architecture:** Extend IndexedDB schema (v3), implement a group-aware rendering engine for the favorites section, and add a selection UI for saving stops.

**Tech Stack:** Vanilla JavaScript, CSS, HTML.

---

### Task 1: Database Migration (v3)

**Files:**
- Modify: `index.html` (Update `BusDB` for v3)

- [ ] **Step 1: Update schema and add migration logic**

```javascript
        // Update DB_VERSION
        DB_VERSION: 3,

        // In onupgradeneeded:
        if (!db.objectStoreNames.contains('favorite_groups')) {
            db.createObjectStore('favorite_groups', { keyPath: 'id', autoIncrement: true });
        }

        // In checkMigrations:
        if (storedAppVersion !== APP_VERSION) {
            const dbVer = await this.getMetadata('db_version');
            if (dbVer < 3) {
                // Seed default groups
                await this.putAll('favorite_groups', [
                    { id: 1, name_tc: '去程', name_en: 'Outgoing', sortOrder: 1 },
                    { id: 2, name_tc: '回程', name_en: 'Back Home', sortOrder: 2 }
                ]);
                // Update existing favorites
                const favs = await this.getAll('favorites');
                for (const f of favs) {
                    if (!f.groupId) {
                        f.groupId = 1;
                        await this.put('favorites', f);
                    }
                }
            }
        }
```

### Task 2: UI for Group Selection (Save Menu)

**Files:**
- Modify: `index.html` (Implement group selection modal/popup)

- [ ] **Step 1: Add Modal CSS and HTML**
- [ ] **Step 2: Update `handleFavoriteClick` to show group selector**
- [ ] **Step 3: Implement Group Creation during save**

### Task 3: Render Favorites by Group

**Files:**
- Modify: `index.html` (Update `renderFavorites` and group sorting)

- [ ] **Step 1: Update `renderFavorites` to fetch groups and favorites**
- [ ] **Step 2: Implement grouped rendering loop**

```javascript
        const groups = await BusDB.getAll('favorite_groups');
        groups.sort((a, b) => a.sortOrder - b.sortOrder);
        // ... render each group with its favorites ...
```

### Task 4: Group Management (Rename/Delete/Sort)

**Files:**
- Modify: `index.html` (Add group header actions and drag-and-drop for groups)

- [ ] **Step 1: Add Edit icon to group headers**
- [ ] **Step 2: Implement Rename and Delete functions**
- [ ] **Step 3: Extend Drag-and-Drop to support reordering group headers**

### Task 5: Verification

- [ ] **Step 1: Test Migration**
Ensure existing favorites are now in the "Outgoing" group.
- [ ] **Step 2: Test Group Creation**
Add a new favorite and create a new group. Verify it appears on the home screen.
- [ ] **Step 3: Test Group Reordering**
Drag a group header to move the entire block of buses.
