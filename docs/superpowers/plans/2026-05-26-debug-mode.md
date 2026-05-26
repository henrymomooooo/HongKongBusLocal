# Debug Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden split-screen debug console triggered by 10 taps on the header title.

**Architecture:** Centralized logger utility that wraps all `BusAPI` fetch calls and renders logs to a togglable UI overlay.

**Tech Stack:** Vanilla JavaScript, CSS, HTML.

---

### Task 1: CSS Foundations for Debug Console

**Files:**
- Modify: `index.html` (Add styles for console and split-screen mode)

- [ ] **Step 1: Add Debug Console Styles**

Add the following styles to the `<style>` block in `index.html`:

```css
        /* Debug Console Styles */
        #debug-console {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 50vh;
            background: #1e1e1e;
            color: #d4d4d4;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            display: flex;
            flex-direction: column;
            z-index: 3000;
            border-top: 2px solid #444;
        }
        #debug-header {
            background: #333;
            padding: 5px 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #444;
        }
        #debug-header span { font-weight: bold; color: #fff; }
        #debug-controls { display: flex; gap: 10px; }
        #debug-controls button {
            background: #444;
            color: #fff;
            border: 1px solid #666;
            padding: 2px 8px;
            cursor: pointer;
            font-size: 11px;
        }
        #debug-controls button:hover { background: #555; }
        #debug-logs {
            flex-grow: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .log-entry { margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .log-meta { display: flex; gap: 10px; color: #888; margin-bottom: 2px; }
        .log-req { color: #569cd6; }
        .log-res { color: #4ec9b0; }
        .log-err { color: #f44747; }
        .log-payload { white-space: pre-wrap; word-break: break-all; }

        /* Split Screen adjustments */
        body.debug-active .container {
            height: 50vh;
            overflow-y: auto;
            padding-bottom: 10px;
        }
        body.debug-active header { border-radius: 0; margin-bottom: 0; }
```

### Task 2: HTML Structure for Debug Console

**Files:**
- Modify: `index.html` (Add console DOM element)

- [ ] **Step 1: Add Debug Console HTML**

Insert this HTML before the closing `</body>` tag:

```html
    <div id="debug-console" class="hidden">
        <div id="debug-header">
            <span><i class="fas fa-terminal"></i> Debug Console</span>
            <div id="debug-controls">
                <button onclick="DebugLogger.clear()">Clear</button>
                <button onclick="DebugLogger.toggle(false)">Close</button>
            </div>
        </div>
        <div id="debug-logs"></div>
    </div>
```

### Task 3: DebugLogger Utility & API Interception

**Files:**
- Modify: `index.html` (Implement Logger and wrap `BusAPI` fetch calls)

- [ ] **Step 1: Implement DebugLogger object**

Add this before the `BusAPI` definition in the `<script>` block:

```javascript
        const DebugLogger = {
            logs: [],
            maxLogs: 50,
            active: false,

            toggle(force) {
                this.active = force !== undefined ? force : !this.active;
                const consoleEl = document.getElementById('debug-console');
                if (this.active) {
                    consoleEl.classList.remove('hidden');
                    document.body.classList.add('debug-active');
                    this.render();
                } else {
                    consoleEl.classList.add('hidden');
                    document.body.classList.remove('debug-active');
                }
            },

            log(type, method, url, payload, status = '') {
                const entry = {
                    timestamp: new Date().toLocaleTimeString() + '.' + new Date().getMilliseconds().toString().padStart(3, '0'),
                    type, method, url, payload, status
                };
                this.logs.push(entry);
                if (this.logs.length > this.maxLogs) this.logs.shift();
                if (this.active) this.render();
            },

            clear() {
                this.logs = [];
                this.render();
            },

            render() {
                const container = document.getElementById('debug-logs');
                if (!container) return;
                
                container.innerHTML = this.logs.map(log => `
                    <div class="log-entry">
                        <div class="log-meta">
                            <span>[${log.timestamp}]</span>
                            <span class="log-${log.type.toLowerCase()}">${log.type} ${log.method}</span>
                            <span>${log.status}</span>
                        </div>
                        <div style="color: #bbb; margin-bottom: 2px;">${log.url}</div>
                        <div class="log-payload">${typeof log.payload === 'object' ? JSON.stringify(log.payload, null, 2) : log.payload}</div>
                    </div>
                `).join('');
                container.scrollTop = container.scrollHeight;
            }
        };
```

- [ ] **Step 2: Wrap BusAPI fetch calls**

Update `fetchKMB`, `fetchCTB`, and `fetchNLB` in `BusAPI` to use `DebugLogger`. Example for `fetchKMB`:

```javascript
            async fetchKMB(endpoint) {
                const url = `${this.KMB_BASE}${endpoint}`;
                DebugLogger.log('REQ', 'GET', url, '...');
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const json = await res.json();
                    DebugLogger.log('RES', 'GET', url, json.data, res.status);
                    return json.data;
                } catch (e) {
                    DebugLogger.log('ERR', 'GET', url, e.message);
                    console.error('KMB Fetch Error:', e);
                    return null;
                }
            },
```
*(Repeat logic for fetchCTB, fetchNLB, and getCTBStopInfo)*

### Task 4: Activation Trigger (10 Taps)

**Files:**
- Modify: `index.html` (Add tap listener to header)

- [ ] **Step 1: Add tap tracking logic**

Add these variables and the listener at the end of the `<script>` block:

```javascript
        let headerTapCount = 0;
        let lastHeaderTapTime = 0;

        document.querySelector('header h1').addEventListener('click', () => {
            const now = Date.now();
            if (now - lastHeaderTapTime > 500) {
                headerTapCount = 1;
            } else {
                headerTapCount++;
            }
            lastHeaderTapTime = now;

            if (headerTapCount === 10) {
                headerTapCount = 0;
                DebugLogger.toggle(true);
            }
        });
```

### Task 5: Verification

- [ ] **Step 1: Test Activation**
Tapping the header 10 times quickly should open the console and split the screen.

- [ ] **Step 2: Verify Logging**
Perform searches or refresh ETAs. Verify that requests and JSON responses appear in the console.

- [ ] **Step 3: Test Close/Clear**
Ensure "Clear" wipes the logs and "Close" restores the full-screen UI.
