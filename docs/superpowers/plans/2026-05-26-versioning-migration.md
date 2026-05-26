# Versioning and Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement version tracking in IndexedDB and an application-level migration framework.

**Architecture:** Increment IndexedDB version, add a `metadata` store, and implement a post-init migration check.

**Tech Stack:** Vanilla JavaScript (IndexedDB), HTML.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `index.html` (Update `BusDB.DB_VERSION` and `onupgradeneeded`)

- [ ] **Step 1: Increment DB_VERSION and add metadata store**

Update `BusDB` object:
```javascript
        const BusDB = {
            DB_NAME: 'HKBusDB',
            DB_VERSION: 2, // Increment from 1 to 2
            // ...
```

Update `onupgradeneeded`:
```javascript
                        request.onupgradeneeded = (e) => {
                            const db = e.target.result;
                            if (!db.objectStoreNames.contains('routes')) {
                                db.createObjectStore('routes', { keyPath: 'id' });
                            }
                            if (!db.objectStoreNames.contains('favorites')) {
                                db.createObjectStore('favorites', { keyPath: 'favId', autoIncrement: true });
                            }
                            if (!db.objectStoreNames.contains('metadata')) {
                                db.createObjectStore('metadata', { keyPath: 'key' });
                            }
                        };
```

### Task 2: Implement Metadata Helpers and App Version

**Files:**
- Modify: `index.html` (Add `APP_VERSION` and metadata read/write methods)

- [ ] **Step 1: Define APP_VERSION**

Add at the top of the `<script>` block:
```javascript
        const APP_VERSION = '1.1.0';
```

- [ ] **Step 2: Add metadata methods to BusDB**

```javascript
            async getMetadata(key) {
                const data = await this.get('metadata', key);
                return data ? data.value : null;
            },

            async setMetadata(key, value) {
                return this.put('metadata', { key, value });
            },
```

### Task 3: Migration Framework and Seeding

**Files:**
- Modify: `index.html` (Implement `checkMigrations` and call it in `init`)

- [ ] **Step 1: Implement checkMigrations function**

Add this function inside `BusDB`:

```javascript
            async checkMigrations() {
                const storedAppVersion = await this.getMetadata('app_version');
                
                if (!storedAppVersion) {
                    // Fresh install or first time versioning
                    DebugLogger.log('SYS', 'DB', 'Initializing metadata', APP_VERSION);
                    await this.setMetadata('app_version', APP_VERSION);
                    await this.setMetadata('db_version', this.DB_VERSION);
                    await this.setMetadata('install_date', Date.now());
                    return;
                }

                if (storedAppVersion !== APP_VERSION) {
                    DebugLogger.log('SYS', 'MIGRATE', `Upgrading from ${storedAppVersion} to ${APP_VERSION}`);
                    // Placeholder for future migration logic
                    // await this.runMigrations(storedAppVersion, APP_VERSION);
                    
                    await this.setMetadata('app_version', APP_VERSION);
                    await this.setMetadata('db_version', this.DB_VERSION);
                }
            },
```

- [ ] **Step 2: Update init() to call checkMigrations**

```javascript
            async init() {
                return new Promise((resolve) => {
                    // ... existing success handler ...
                        request.onsuccess = async (e) => {
                            this.db = e.target.result;
                            await this.checkMigrations(); // New call
                            resolve();
                        };
                    // ...
```

### Task 4: UI Updates

**Files:**
- Modify: `index.html` (Show version in Debug Console)

- [ ] **Step 1: Update Debug Console Header**

Find `#debug-header span` and update it:

```javascript
        // In DebugLogger.toggle or similar initialization
        const debugTitle = document.querySelector('#debug-header span');
        if (debugTitle) debugTitle.innerHTML = `<i class="fas fa-terminal"></i> Debug Console <small style="opacity: 0.7; font-weight: normal;">(v${APP_VERSION})</small>`;
```

### Task 5: Verification

- [ ] **Step 1: Verify DB Update**
Open the app. Check IndexedDB in DevTools (if possible) or check Debug Console logs.

- [ ] **Step 2: Verify Metadata Logs**
Verify that "Initializing metadata" or "Upgrading" appears in the Debug Console.

- [ ] **Step 3: Verify Version Display**
Open Debug Mode (10 taps) and ensure `(v1.1.0)` appears in the header.
