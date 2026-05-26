# Debug Mode Design - HK Bus Arrivals

**Goal:** Implement a hidden debug mode that logs all API requests and responses to a split-screen console for verification and troubleshooting.

## 1. Activation Mechanism
- **Secret Action:** Users must tap the header title (`header h1`) 10 times quickly.
- **Logic:**
    - Track `lastTapTime` and `tapCount`.
    - If the gap between taps is > 500ms, reset `tapCount`.
    - Upon reaching 10 taps, toggle the debug console visibility.
- **Deactivation:** A clear "Close" button within the debug console for easy exit.

## 2. Data Capture (Logger)
- **Centralized Wrapper:** Intercept all network calls in the `BusAPI` object.
- **Log Structure:**
    ```javascript
    {
        timestamp: "HH:mm:ss.ms",
        type: "REQ" | "RES" | "ERR",
        method: "GET",
        url: "https://...",
        status: 200,
        payload: { ... } // JSON response or error message
    }
    ```
- **Storage:** Maintain a global `DEBUG_LOGS` array (capped at 50-100 entries to prevent memory bloat).

## 3. User Interface (The Console)
- **Split Screen Layout:**
    - When active, the main `<body>` or a wrapper around the app content will have `height: 50vh; overflow-y: auto;`.
    - The debug console will appear as a fixed container at the bottom: `height: 50vh; width: 100%; position: fixed; bottom: 0;`.
- **Styling:**
    - Dark theme for the console (monospaced font).
    - Color-coded log levels (Cyan/Blue for Requests, Green for Success, Red for Errors).
- **Controls:**
    - **Clear:** Wipes the log array and UI.
    - **Close:** Hides the console and restores the app to full-screen.

## 4. Implementation Details
- **CSS:** Use flexbox or fixed positioning for the split-screen effect. Use `z-index` to ensure the console is above other elements but below any high-priority modals if they exist.
- **JS:** 
    - Modify `BusAPI.fetchKMB`, `BusAPI.fetchCTB`, and `BusAPI.fetchNLB` to call `DebugLogger.log()`.
    - Create a `renderLogs()` function to update the UI whenever a new log arrives.

## 5. Persistence
- **State:** Debug mode status will NOT persist across page refreshes by default (security/cleanliness), but logs will persist until the session ends or is cleared.
