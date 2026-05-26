# Tabbed Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a tabbed interface for favorites with active-tab-only data fetching and draggable tabs.

**Architecture:** Add a tab bar component, track `activeGroupId` in state, filter rendering by ID, and update reordering logic for horizontal movement.

**Tech Stack:** Vanilla JavaScript, CSS, HTML.

---

### Task 1: UI Foundations & Tab Bar Styles

**Files:**
- Modify: `index.html` (Add tab bar container and styles)

- [ ] **Step 1: Add Tab Bar Styles**

Add to `<style>`:
```css
        .fav-tab-bar {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
            overflow-x: auto;
            padding-bottom: 5px;
            scrollbar-width: none; /* Hide scrollbar for clean look */
        }
        .fav-tab-bar::-webkit-scrollbar { display: none; }
        .fav-tab {
            flex: 0 0 auto;
            padding: 8px 15px;
            background: #eee;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 5px;
            border: 1px solid transparent;
        }
        .fav-tab.active {
            background: var(--kmb-red);
            color: white;
        }
        .fav-tab.dragging {
            opacity: 0.7;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            position: absolute;
            z-index: 1000;
        }
```

- [ ] **Step 2: Add Tab Bar Container**

Insert `#favorites-tabs` before `#favorites-list` in the HTML.

### Task 2: State Management & Rendering Refactor

**Files:**
- Modify: `index.html` (Update `renderFavorites` and state)

- [ ] **Step 1: Initialize `activeGroupId`**

Define `let activeGroupId = null;` in state.

- [ ] **Step 2: Update `renderFavorites`**

1. Fetch groups and favorites.
2. If `activeGroupId` is null, set it to the first group's ID (by `sortOrder`).
3. Render the Tab Bar in `#favorites-tabs`.
4. Render *only* the favorites for `activeGroupId` in `#favorites-list`.
5. If the list is empty, show: `t('addToGroupPrompt')`.

### Task 3: Context-Aware ETA Refreshing

**Files:**
- Modify: `index.html` (Update `refreshAllETAs` and `updateETA`)

- [ ] **Step 1: Update `refreshAllETAs`**

Modify to only iterate through favorites belonging to `activeGroupId`.

- [ ] **Step 2: Trigger refresh on Tab Switch**

When clicking a tab, set `activeGroupId`, call `renderFavorites`, and then `refreshAllETAs`.

### Task 4: Draggable Tabs & Persistence

**Files:**
- Modify: `index.html` (Implement horizontal drag for tabs)

- [ ] **Step 1: Implement `handleTabPointerDown`**

Adapt existing pointer logic to work horizontally for `.fav-tab` elements.

- [ ] **Step 2: Update `saveReorderedGroups`**

Read the order of `.fav-tab` elements in the DOM and update `favorite_groups` in IndexedDB.

### Task 5: UX Polish & Group Management

**Files:**
- Modify: `index.html` (Update modal and edit logic)

- [ ] **Step 1: Modal Switch**

When adding a favorite to a group, set `activeGroupId` to that group ID so the user sees their new addition immediately.

- [ ] **Step 2: Group Header Actions**

Move the "Gear" icon from the header (since it's gone) into the active tab or next to the active tab's label.

### Task 6: Verification

- [ ] **Step 1: Test Tab Switching**
Switch between Outgoing and Back Home. Verify ETAs only load for the active one.
- [ ] **Step 2: Test Tab Reordering**
Drag "Back Home" to the first position. Refresh page. It should stay first.
- [ ] **Step 3: Test Empty State**
Check a new empty group for the "Add a bus" message.
