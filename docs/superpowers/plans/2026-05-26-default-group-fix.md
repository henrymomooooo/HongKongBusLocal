# Default Group Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure default groups (ID 1 and 2) are always visible and cannot be deleted.

**Architecture:** Update rendering logic to ignore emptiness for default groups, restrict the delete action in the UI, and add a self-healing check on startup.

**Tech Stack:** Vanilla JavaScript.

---

### Task 1: Self-Healing Initialization

**Files:**
- Modify: `index.html` (Update `BusDB.checkMigrations`)

- [ ] **Step 1: Add existence check for default groups**

Update `checkMigrations` to ensure groups 1 and 2 always exist:

```javascript
            async checkMigrations() {
                const storedAppVersion = await this.getMetadata('app_version');
                const dbVer = await this.getMetadata('db_version');

                // Self-healing check for default groups (1 and 2)
                const groups = await this.getAll('favorite_groups');
                if (!groups.find(g => g.id === 1) || !groups.find(g => g.id === 2)) {
                    if (!groups.find(g => g.id === 1)) await this.put('favorite_groups', { id: 1, name_tc: '去程', name_en: 'Outgoing', sortOrder: 1 });
                    if (!groups.find(g => g.id === 2)) await this.put('favorite_groups', { id: 2, name_tc: '回程', name_en: 'Back Home', sortOrder: 2 });
                }

                if (storedAppVersion !== APP_VERSION) {
                    // ... existing migration logic ...
```

### Task 2: Rendering Fix (Always Visible)

**Files:**
- Modify: `index.html` (Update `renderFavorites`)

- [ ] **Step 1: Always render default groups**

Modify the `groups.forEach` loop in `renderFavorites`:

```javascript
            // Render groups
            groups.forEach(group => {
                const groupFavs = favs.filter(f => f.groupId === group.id);
                // ALWAYS render if it's a default group (1 or 2), otherwise only if not empty
                if (group.id === 1 || group.id === 2 || groupFavs.length > 0) {
                    // ... rendering code ...
                }
            });
```

### Task 3: Restrict Deletion

**Files:**
- Modify: `index.html` (Update `handleGroupEditClick`)

- [ ] **Step 1: Prevent deletion of default groups**

Update `handleGroupEditClick` to only allow renaming for IDs 1 and 2:

```javascript
        async handleGroupEditClick(e, groupId) {
            e.stopPropagation();
            const groups = await BusDB.getAll('favorite_groups');
            const group = groups.find(g => g.id === groupId);
            if (!group) return;

            if (groupId === 1 || groupId === 2) {
                // Default groups: Only Rename
                const newName = prompt(t('renameGroup'), localized(group, 'name'));
                if (newName && newName.trim()) {
                    group.name_tc = newName.trim();
                    group.name_en = newName.trim();
                    await BusDB.put('favorite_groups', group);
                    renderFavorites();
                }
            } else {
                // Custom groups: Rename or Delete
                const action = confirm(`${t('renameGroup')}? (${t('cancel')} = ${t('deleteGroup')})`);
                // ... existing logic ...
            }
        }
```

### Task 4: Verification

- [ ] **Step 1: Verify Visibility**
Ensure "Outgoing" and "Back Home" are visible even if they have no favorites.
- [ ] **Step 2: Verify Deletion Restriction**
Try to edit a default group and ensure no delete option is presented (or works).
- [ ] **Step 3: Verify Self-Healing**
(Optional/Dev) Manually delete a default group from DevTools and refresh the page to see if it's recreated.
