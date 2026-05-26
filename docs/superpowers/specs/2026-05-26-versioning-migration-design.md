# Versioning and Migration Design - HK Bus Arrivals

**Goal:** Implement a robust versioning system for both the application (HTML/JS) and the database (IndexedDB) to facilitate smooth migrations and feature identification.

## 1. Versioning Definitions
- **Application Version (`APP_VERSION`):** A semantic version string (e.g., `1.1.0`) hardcoded in the script. Used to track UI/Logic updates.
- **Database Schema Version (`DB_SCHEMA_VERSION`):** An integer used by IndexedDB's `onupgradeneeded` mechanism.
- **Stored Metadata:** A new table in IndexedDB to persist the *last known* versions on the client's device.

## 2. Database Changes (`BusDB`)
- **New ObjectStore:** `metadata`
    - **KeyPath:** `key`
    - **Initial Seed Values:**
        - `{ key: 'db_version', value: 2 }`
        - `{ key: 'app_version', value: '1.1.0' }`
        - `{ key: 'install_date', value: Date.now() }`

## 3. Migration Workflow
1. **Initialization:**
   - App starts and calls `BusDB.init()`.
   - `BusDB.DB_VERSION` is incremented to trigger schema updates.
2. **Detection:**
   - After DB is open, the app reads the `metadata` table.
   - It compares `stored_app_version` with current `APP_VERSION`.
3. **Execution:**
   - If `stored_app_version` < `APP_VERSION`, a `runMigrations(old, new)` function is triggered.
   - Example migration tasks:
     - Clear specific route caches if the data format changed.
     - Add default values to existing favorite records.
     - Force-refresh the bus company route lists.
4. **Finalization:**
   - Update `metadata` table with the new current versions.

## 4. UI Integration
- Display the version number in the **Debug Console** header for easy identification during troubleshooting.
- Format: `Debug Console (v1.1.0)`

## 5. Security & Safety
- Migrations must be idempotent or have strict "run once" logic.
- If a migration fails, the app should still attempt to function but log the error to the Debug Console.
