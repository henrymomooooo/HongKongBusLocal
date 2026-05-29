# Hong Kong MTR Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone, real-time, offline-first MTR transit dashboard (`mtr.html`) featuring favorites quick-star binding, interactive vector SVG route map navigation, closest-station GPS auto-detection, and system-wide service disruption alerts.

**Architecture:** A standalone single-page application (SPA) matching bus.html's look-and-feel. Uses an isolated IndexedDB (`MTR_DB` at v1) for favorites and settings, and fetches live arrivals directly from DATA.GOV.HK.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript, FontAwesome Icons, IndexedDB.

---

### Task 1: Basic File Setup & Theme Shell

**Files:**
- Create: `mtr.html`

- [ ] **Step 1: Write core HTML structure**
  Write the standard SPA layout with mobile viewport settings, FontAwesome stylesheet links, and a clean template containing the header (with placeholders for MTR logo, GPS pill, and language switch), the main content container, and a bottom sticky tab bar navigation.
  
  ```html
  <!DOCTYPE html>
  <html lang="zh-HK">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>HK MTR Arrivals</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
          /* Variable overrides matching MTR dark-mode visual branding */
          :root {
              --bg-main: #121212;
              --bg-card: #1e1e1e;
              --text-main: #f5f5f7;
              --text-sub: #86868b;
              --border-color: #2d2d2f;
              --accent-color: #005A9C;
              --star-active: #ffc107;
              --arriving-color: #ff9f0a;
              --normal-green: #34c759;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: var(--bg-main);
              color: var(--text-main);
              line-height: 1.5;
              overflow-x: hidden;
          }
          /* Sticky Navigation Tab Bar styling */
          .nav-bar {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 60px;
              background: var(--bg-card);
              border-top: 1px solid var(--border-color);
              display: flex;
              justify-content: space-around;
              align-items: center;
              z-index: 100;
          }
          .nav-tab {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: var(--text-sub);
              text-decoration: none;
              font-size: 11px;
              cursor: pointer;
          }
          .nav-tab.active { color: var(--accent-color); font-weight: bold; }
          .nav-tab i { font-size: 20px; margin-bottom: 3px; }
      </style>
  </head>
  <body>
      <!-- App Shell goes here -->
  </body>
  </html>
  ```

- [ ] **Step 2: Add translation dictionaries**
  Embed the full standard translation script at the top of the `<script>` tag inside `mtr.html` for instant localizations.
  
  ```javascript
  const TRANSLATIONS = {
      'zh-HK': {
          favorites: "收藏", map: "路綫圖", search: "搜尋", to: "往", arriving: "正在抵站",
          mins: "分鐘", platform: "月台", back: "返回", loading: "載入中...", noETA: "暫無班次數據"
      },
      'en': {
          favorites: "Favorites", map: "Map", search: "Search", to: "to", arriving: "Arriving",
          mins: "mins", platform: "Plat.", back: "Back", loading: "Loading...", noETA: "No ETA Data"
      }
  };
  let currentLang = localStorage.getItem('mtr_lang') || 'zh-HK';
  function t(key) { return TRANSLATIONS[currentLang][key] || key; }
  ```

- [ ] **Step 3: Verify basic UI loads**
  Run: `python3 -m http.server 8000`
  Verify: Access `http://localhost:8000/mtr.html` and check that the dark app shell, header bar, and bottom navigation render without errors.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): initialize basic mtr.html app shell and styling"
  ```

---

### Task 2: IndexedDB Initialization (`MTR_DB`)

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write DB initialization manager**
  Add database open/creation logic with transactional error handles in the javascript segment of `mtr.html` to create `MTR_DB` at Version 1.
  
  ```javascript
  const MTR_DB = {
      db: null,
      open() {
          return new Promise((resolve, reject) => {
              const req = indexedDB.open('MTR_DB', 1);
              req.onupgradeneeded = (e) => {
                  const db = e.target.result;
                  if (!db.objectStoreNames.contains('favorites')) {
                      db.createObjectStore('favorites', { keyPath: 'favId', autoIncrement: true });
                  }
                  if (!db.objectStoreNames.contains('user_settings')) {
                      db.createObjectStore('user_settings', { keyPath: 'key' });
                  }
                  if (!db.objectStoreNames.contains('metadata')) {
                      db.createObjectStore('metadata', { keyPath: 'key' });
                  }
              };
              req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
              req.onerror = (e) => reject(e.target.error);
          });
      }
  };
  ```

- [ ] **Step 2: Add basic database query utilities**
  Implement the standard helper wrappers to perform CRUD transactions on `favorites` and `user_settings`.
  
  ```javascript
  MTR_DB.getFavorites = function() {
      return new Promise((res) => {
          const tx = this.db.transaction('favorites', 'readonly');
          const req = tx.objectStore('favorites').getAll();
          req.onsuccess = () => res(req.result);
      });
  };
  MTR_DB.addFavorite = function(fav) {
      return new Promise((res) => {
          const tx = this.db.transaction('favorites', 'readwrite');
          tx.objectStore('favorites').add(fav).onsuccess = () => res();
      });
  };
  MTR_DB.deleteFavorite = function(favId) {
      return new Promise((res) => {
          const tx = this.db.transaction('favorites', 'readwrite');
          tx.objectStore('favorites').delete(favId).onsuccess = () => res();
      });
  };
  ```

- [ ] **Step 3: Verify DB initializes**
  Open the page in the browser, check the **Developer Tools (F12) -> Application -> IndexedDB** section, and verify that the `MTR_DB` database has successfully loaded at version 1 with the 3 stores.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): implement MTR_DB IndexedDB initialization and wrappers"
  ```

---

### Task 3: Static Stations & Lines Registry

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write static lines and stations dataset**
  Declare the raw array containing all 10 MTR lines and their associated station sequences inside the JS tag. Include latitude and longitude parameters for each station to support distance-based calculations.
  
  ```javascript
  const MTR_LINES = {
      "TWL": { name_tc: "荃灣綫", name_en: "Tsuen Wan Line", color: "#E2231A", stations: [
          { code: "CEN", name_tc: "中環", name_en: "Central", lat: 22.2818, long: 114.1581 },
          { code: "ADM", name_tc: "金鐘", name_en: "Admiralty", lat: 22.2794, long: 114.1645 },
          { code: "TST", name_tc: "尖沙咀", name_en: "Tsim Sha Tsui", lat: 22.2988, long: 114.1722 },
          { code: "MOK", name_tc: "旺角", name_en: "Mong Kok", lat: 22.3197, long: 114.1685 }
          // Add remaining stations as detailed in the official spec
      ]},
      "ISL": { name_tc: "港島綫", name_en: "Island Line", color: "#005A9C", stations: [
          { code: "KEN", name_tc: "堅尼地城", name_en: "Kennedy Town", lat: 22.2818, long: 114.1278 },
          { code: "ADM", name_tc: "金鐘", name_en: "Admiralty", lat: 22.2794, long: 114.1645 }
          // Add remaining stations
      ]}
  };
  ```

- [ ] **Step 2: Add search lookup indexes**
  Create helper variables compiling a flat station index to support lightning-fast searches and GPS positioning calculations.
  
  ```javascript
  const STATIONS_INDEX = new Map();
  Object.keys(MTR_LINES).forEach(lineKey => {
      MTR_LINES[lineKey].stations.forEach(sta => {
          if (!STATIONS_INDEX.has(sta.code)) {
              STATIONS_INDEX.set(sta.code, { ...sta, lines: [] });
          }
          STATIONS_INDEX.get(sta.code).lines.push(lineKey);
      });
  });
  ```

- [ ] **Step 3: Verify static datasets are parsed**
  Open the browser console, query `STATIONS_INDEX.get('ADM')` and verify it correctly returns Admiralty station with its lines array `['TWL', 'ISL']`.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): embed static MTR lines and station sequences database"
  ```

---

### Task 4: Next Train API Integrator

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write MTR API schedule fetcher**
  Implement the fetch adapter to retrieve real-time schedule information directly from the government API.
  
  ```javascript
  const MtrAPI = {
      BASE_URL: "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php",
      async getSchedule(line, station) {
          const url = `${this.BASE_URL}?line=${line}&sta=${station}&lang=${currentLang === 'zh-HK' ? 'TC' : 'EN'}`;
          try {
              const res = await fetch(url);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const json = await res.json();
              return json.data ? json.data[`${line}-${station}`] : null;
          } catch (e) {
              console.error("MTR Fetch Error:", e);
              return null;
          }
      }
  };
  ```

- [ ] **Step 2: Add parallel fetching for interchanges**
  Create a unified utility that takes a station code, looks up its intersecting lines, fetches schedules in parallel using `Promise.allSettled`, and returns a combined departures object.
  
  ```javascript
  async function fetchStationDepartures(stationCode) {
      const staInfo = STATIONS_INDEX.get(stationCode);
      if (!staInfo) return null;
      const promises = staInfo.lines.map(line => 
          MtrAPI.getSchedule(line, stationCode).then(data => ({ line, data }))
      );
      const results = await Promise.allSettled(promises);
      const output = {};
      results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.data) {
              output[r.value.line] = r.value.data;
          }
      });
      return output;
  }
  ```

- [ ] **Step 3: Verify API integrations**
  Open browser Developer Tools, execute:
  `fetchStationDepartures('ADM').then(console.log)`
  Verify: Schedules are fetched directly from DATA.GOV.HK and display train directions (`UP` and `DOWN`) for Tsuen Wan Line, Island Line, etc.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): implement MtrAPI schedule fetcher and parallel interchange loader"
  ```

---

### Task 5: Mobile-Responsive Station Detail Panel (Option A Stack)

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Create overlay HTML & CSS container**
  Design the Station details panel that slides up from the bottom of the screen. Incorporate responsive media styles to ensure columns layout neatly.
  
  ```css
  .station-overlay {
      position: fixed;
      top: 0; bottom: 0; left: 0; right: 0;
      background: var(--bg-main);
      z-index: 200;
      overflow-y: auto;
      padding: 20px;
  }
  /* Grid structure */
  .interchange-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
      margin-top: 15px;
  }
  @media (min-width: 768px) {
      .interchange-grid {
          grid-template-columns: 1fr 1fr;
      }
  }
  ```

- [ ] **Step 2: Add dynamic line-card rendering**
  Write the rendering method creating styled cards corresponding to each passing line. Use the official colors mapped inside `MTR_LINES`.
  
  ```javascript
  function renderStationOverlay(stationCode) {
      const sta = STATIONS_INDEX.get(stationCode);
      const container = document.getElementById('overlay-content');
      container.innerHTML = `
          <h2>${currentLang === 'zh-HK' ? sta.name_tc : sta.name_en}</h2>
          <div class="interchange-grid" id="overlay-grid"></div>
      `;
      
      fetchStationDepartures(stationCode).then(schedules => {
          const grid = document.getElementById('overlay-grid');
          sta.lines.forEach(lineCode => {
              const lineInfo = MTR_LINES[lineCode];
              const sched = schedules[lineCode] || { UP: [], DOWN: [] };
              const card = document.createElement('div');
              card.style.borderTop = `4px solid ${lineInfo.color}`;
              card.className = 'line-card';
              
              // Map UP/DOWN countdowns
              let upHtml = (sched.UP || []).map(train => `
                  <div>${t('to')} ${train.dest}: <strong>${train.ttnt === '0' ? t('arriving') : train.ttnt + ' ' + t('mins')}</strong></div>
              `).join('') || `<div>${t('noETA')}</div>`;
              
              card.innerHTML = `
                  <h3 style="color:${lineInfo.color}">${currentLang === 'zh-HK' ? lineInfo.name_tc : lineInfo.name_en}</h3>
                  <div class="departures-list">${upHtml}</div>
              `;
              grid.appendChild(card);
          });
      });
  }
  ```

- [ ] **Step 3: Verify layout responsive states**
  Test inside the browser. Open the detail card and resize the window.
  Verify: On mobile widths (<768px), cards stack vertically. On wider tablet/desktop screens, they form a 2-column grid.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): add responsive station details overlay with vertical mobile stacking"
  ```

---

### Task 6: Interactive vector SVG Route Map Tab

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write interactive vector SVG schematic**
  Insert a beautifully styled inline schematic SVG representation of the MTR network inside the Map Tab view pane. Map circles representing station nodes and lines matching MTR colors.
  
  ```html
  <div id="map-tab-view" class="tab-content hidden">
      <svg viewBox="0 0 800 600" width="100%" height="100%" style="background:#1a1a1a; border-radius:12px;">
          <!-- SVG Lines representing rails -->
          <line x1="100" y1="300" x2="700" y2="300" stroke="#005A9C" stroke-width="8" />
          <line x1="400" y1="100" x2="400" y2="500" stroke="#E2231A" stroke-width="8" />
          
          <!-- Clickable Station Nodes -->
          <circle cx="400" cy="300" r="10" fill="#fff" stroke="#333" stroke-width="3" cursor="pointer" onclick="openStation('ADM')" />
          <text x="400" y="325" fill="#fff" font-size="12" text-anchor="middle">Admiralty</text>
      </svg>
  </div>
  ```

- [ ] **Step 2: Link nodes to overlay controls**
  Ensure clicking on any station circle correctly triggers `renderStationOverlay(stationCode)` and loads schedule details smoothly.

- [ ] **Step 3: Verify SVG interactions**
  Click the "Route Map" tab and tap the Admiralty station node in the vector graphics map.
  Verify: The station departures overlay slides up instantly and displays train ETAs.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): implement interactive vector SVG route map navigation tab"
  ```

---

### Task 7: GPS Nearest-Station Finder & Geolocation Pill

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Implement Haversine Distance algorithm**
  Add the standard coordinate offset calculation utility in the javascript helpers block.
  
  ```javascript
  function getDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // metres
      const r1 = lat1 * Math.PI/180;
      const r2 = lat2 * Math.PI/180;
      const df = (lat2-lat1) * Math.PI/180;
      const dl = (lon2-lon1) * Math.PI/180;
      const a = Math.sin(df/2) * Math.sin(df/2) +
                Math.cos(r1) * Math.cos(r2) *
                Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // in metres
  }
  ```

- [ ] **Step 2: Add GPS position listener**
  Listen for coordinate changes using `navigator.geolocation.watchPosition` and render the active/acquiring status pill in the header.
  
  ```javascript
  let userCoords = null;
  function startGPSWatch() {
      const pill = document.getElementById('gps-pill');
      pill.innerHTML = `<i class="fas fa-spinner fa-spin"></i> GPS...`;
      navigator.geolocation.watchPosition(
          (pos) => {
              userCoords = { lat: pos.coords.latitude, long: pos.coords.longitude };
              pill.innerHTML = `<i class="fas fa-location-crosshairs pulsing"></i> GPS Active`;
              checkNearestStation();
          },
          (err) => {
              console.warn(err);
              pill.innerHTML = `<i class="fas fa-location-dot"></i> GPS Off`;
          }
      );
  }
  ```

- [ ] **Step 3: Write closest station scanner**
  Implement the auto-detector logic: If user position is matched, sort all static station nodes. If the closest station is within 500m, notify the user or auto-pin departures.

- [ ] **Step 4: Verify GPS tracking**
  Mock coordinates inside the Developer Console (`navigator.geolocation` simulation) to position near Admiralty.
  Verify: The GPS indicator switches to "Active" and Admiralty station is flagged as closest.

- [ ] **Step 5: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): add GPS Geolocation pill and Haversine nearest station auto-discovery"
  ```

---

### Task 8: Tabbed Favorites & Star Bindings

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write Quick-Star Toggle**
  Add favorite star buttons next to each line inside the departures overlay. Clicking the star saves that route/direction to IndexedDB `favorites` store.
  
  ```javascript
  async function toggleFavorite(stationCode, lineCode, direction) {
      const favs = await MTR_DB.getFavorites();
      const match = favs.find(f => f.stationCode === stationCode && f.lineCode === lineCode && f.direction === direction);
      if (match) {
          await MTR_DB.deleteFavorite(match.favId);
      } else {
          await MTR_DB.addFavorite({ stationCode, lineCode, direction, sortOrder: Date.now() });
      }
      renderFavoritesDashboard();
  }
  ```

- [ ] **Step 2: Design primary Favorites view dashboard**
  Construct the landing view inside the Favorites tab to read saved keys, execute API fetches, and display departures grouped by station with automatic refresh intervals.

- [ ] **Step 3: Verify favorites binding**
  Add Tsuen Wan Line at Admiralty to favorites from the station overlay. Click back to the main tab.
  Verify: The departures appear on the Favorites dashboard and load live countdown schedules instantly.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): implement quick-star favorites bindings and favorites dashboard"
  ```

---

### Task 9: Service Alerts & System Polish

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Fetch MTR System Status Alerts**
  Fetch real-time service updates from MTR Corporation's RSS news feed or API. Render a green badge if services are normal, or show warning banners in the header if delays exist.
  
  ```javascript
  async function checkMtrStatusAlerts() {
      try {
          const res = await fetch("https://rt.data.gov.hk/v1/transport/mtr/getAlerts.php"); // Placeholder/Simulated alert feed
          const alerts = await res.json();
          const alertPill = document.getElementById('mtr-status-badge');
          if (alerts && alerts.hasDisruption) {
              alertPill.innerHTML = `<span style="background:var(--arriving-color); padding:4px 8px; border-radius:12px; font-size:10px;"><i class="fas fa-triangle-exclamation"></i> Delays</span>`;
          } else {
              alertPill.innerHTML = `<span style="background:var(--normal-green); padding:4px 8px; border-radius:12px; font-size:10px;"><i class="fas fa-circle-check"></i> Normal</span>`;
          }
      } catch (e) {
          console.warn("Alert check failed:", e);
      }
  }
  ```

- [ ] **Step 2: Add dynamic language switcher**
  Bind the language header element to toggle `currentLang` (`EN` <-> `TC`), update localStorage, and trigger a clean re-render of all elements and titles.

- [ ] **Step 3: Verify system integrations**
  Verify: All translation keys, language toggle re-renders, and service disruption alerts load flawlessly.

- [ ] **Step 4: Commit**
  ```bash
  git add mtr.html
  git commit -m "feat(mtr): add real-time service disruption alerts and dynamic language switcher"
  ```

---

### Task 10: Automated In-App Test Suite

**Files:**
- Modify: `mtr.html`

- [ ] **Step 1: Write `runAutomatedTests()` console utility**
  Create a globally accessible function `runAutomatedTests()` that runs an automated, self-contained test suite directly in the browser console. It must log results with elegant CSS styling and groups.
  
- [ ] **Step 2: Add Station Registry & Coordinates Indexing Tests**
  Verify that the `STATIONS_INDEX` has been compiled correctly on load, that core stations like Admiralty (`ADM`) and Central (`CEN`) exist, and that their coordinate attributes are valid numbers.

- [ ] **Step 3: Add Translation Dictionary Tests**
  Verify that the `t(key)` function operates correctly, returns appropriate translations in both English and Traditional Chinese, and handles missing keys safely.

- [ ] **Step 4: Add IndexedDB CRUD Transactional Tests**
  Perform async CRUD operations on `favorites` store inside `MTR_DB`: add a temporary favorite, verify it is returned in `getFavorites()`, delete it, and verify the store is clean. Ensure the test restores the original user favorites afterward.

- [ ] **Step 5: Add Geolocation Distance Calculation Tests**
  Verify that `getDistance(lat1, lon1, lat2, lon2)` correctly calculates the Haversine formula distance between two coordinates (e.g. Central and Admiralty, approximately 713 meters).

- [ ] **Step 6: Add API Schema Verification Tests**
  Perform an integration fetch test using `MtrAPI.getSchedule` or `fetchStationDepartures` for a major station. Verify that if a response is returned, it complies with the required next-train API schema (`UP`/`DOWN` arrays with train entries containing `dest`, `plat`, and `ttnt`). Handle network offline states gracefully.

- [ ] **Step 7: Verify test suite execution**
  Open the browser console, type `runAutomatedTests()` and verify that the tests execute and output a detailed green summary showing all assertions passing.

- [ ] **Step 8: Commit**
  ```bash
  git add docs/superpowers/plans/2026-05-29-hk-mtr-dashboard.md mtr.html
  git commit -m "feat(mtr): implement robust in-app automated test suite runAutomatedTests"
  ```

