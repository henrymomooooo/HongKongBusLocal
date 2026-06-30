# Live Ticking ETA & Auto-Refresh Progress Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate real-time ticking ETA countdown badges and an automatic 30-second refresh cycle with a visual progress bar into [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html).

**Architecture:** We use a centralized 1-second JavaScript interval loop to decrement and update all visible ETA elements carrying a `data-eta-time` attribute, formatting the text output by locale. The 30-second API auto-refresh is represented visually by a CSS transition-backed loading bar under the page header.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, and Playwright for E2E validation tests.

---

## File Changes Map
* **Modify**: [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html) — Implement countdown logic, layout updates, auto-refresh progress bar, and ticking intervals.
* **Modify**: [test_traffic_map.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_traffic_map.js) — Add unit tests for the new `getRelativeCountdownTime` formatting helper.
* **Modify**: [test_playwright_e2e.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_playwright_e2e.js) — Add E2E tests verifying progress bar rendering, reset logic, and ticking badge updates.

---

### Task 1: Time Formatter Function & Unit Tests

**Files:**
* Modify: [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html)
* Modify: [test_traffic_map.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_traffic_map.js)

- [ ] **Step 1: Write the failing unit tests**
  Add test assertions to [test_traffic_map.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_traffic_map.js) for `getRelativeCountdownTime`.

  Add this chunk to [test_traffic_map.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_traffic_map.js):
  ```javascript
  // Around line 46, extract the new function:
  const getRelativeCountdownTimeCode = extractFunction('getRelativeCountdownTime');
  vm.runInContext(getRelativeCountdownTimeCode, context);
  const { getRelativeCountdownTime } = context;

  // Add the following test case inside the main test suite:
  await t.test('getRelativeCountdownTime: formats remaining time correctly', () => {
      const now = new Date('2026-06-30T12:00:00Z');
      
      // Test cases for English (en)
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 12:12:45', now, 'en'), '12m 45s');
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 12:00:45', now, 'en'), '45s');
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 11:59:59', now, 'en'), 'Arrived');
      assert.strictEqual(getRelativeCountdownTime('', now, 'en'), 'Scheduled');
      
      // Test cases for Traditional Chinese (tc)
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 12:12:45', now, 'tc'), '12分45秒');
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 12:00:45', now, 'tc'), '45秒');
      assert.strictEqual(getRelativeCountdownTime('2026-06-30 11:59:59', now, 'tc'), '已到站');
      assert.strictEqual(getRelativeCountdownTime('', now, 'tc'), '預定班次');
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node test_traffic_map.js`
  Expected: FAIL (Throws "Function getRelativeCountdownTime not found in script")

- [ ] **Step 3: Write the implementation in bus_all.html**
  Add the helper function inside the `<script>` block in [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html):
  ```javascript
  function getRelativeCountdownTime(targetTimeStr, nowObj, locale) {
      if (!targetTimeStr) return locale === 'tc' ? '預定班次' : 'Scheduled';
      const target = new Date(targetTimeStr.replace(' ', 'T'));
      if (isNaN(target.getTime())) return locale === 'tc' ? '預定班次' : 'Scheduled';
      const diffMs = target - nowObj;
      if (diffMs <= 0) return locale === 'tc' ? '已到站' : 'Arrived';
      const totalSec = Math.floor(diffMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      if (mins >= 1) {
          return locale === 'tc' ? `${mins}分${secs}秒` : `${mins}m ${secs}s`;
      } else {
          return locale === 'tc' ? `${secs}秒` : `${secs}s`;
      }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node test_traffic_map.js`
  Expected: PASS (All math and layout format tests pass)

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add bus_all.html test_traffic_map.js
  git commit -m "feat(countdown): add getRelativeCountdownTime and verify with unit tests"
  ```

---

### Task 2: Visual Progress Bar UI & Styles

**Files:**
* Modify: [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html)

- [ ] **Step 1: Write failing visual layout expectations**
  In [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html), locate the `<header>` element and insert the markup for the progress bar container.

  Find:
  ```html
      <header>
          <h1><i class="fas fa-bus"></i> <span data-i18n="title">HK Bus Arrivals</span></h1>
          <div class="lang-switch" id="lang-switch" onclick="toggleLanguage()"></div>
      </header>
  ```
  Replace with:
  ```html
      <header style="position: relative;">
          <h1><i class="fas fa-bus"></i> <span data-i18n="title">HK Bus Arrivals</span></h1>
          <div class="lang-switch" id="lang-switch" onclick="toggleLanguage()"></div>
          <div id="refresh-progress-bar" style="position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255, 255, 255, 0.7); width: 0%; transition: width 1s linear; pointer-events: none;"></div>
      </header>
  ```

- [ ] **Step 2: Commit layout update**
  Run:
  ```bash
  git add bus_all.html
  git commit -m "style(progress-bar): add progress bar container to header"
  ```

---

### Task 3: Render ETA absolute timestamps

**Files:**
* Modify: [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html)

- [ ] **Step 1: Update favorites and drawer ETA rendering logic**
  Modify [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html) to render `.eta-countdown` spans using target timestamps rather than pre-formatted values.

  For Favorites Card rendering inside `updateETA(f)`:
  Find:
  ```javascript
                  const r = (etas) => { if (!etas || etas.length === 0) { c.textContent = t('noETA'); return; } c.innerHTML = etas.slice(0, 3).map(i => `<span>${getRelativeTime(f.co === 'NLB' ? i.estimatedArrivalTime : i.eta)}</span>`).join(', '); };
  ```
  Replace with:
  ```javascript
                  const r = (etas) => { 
                      if (!etas || etas.length === 0) { c.textContent = t('noETA'); return; } 
                      c.innerHTML = etas.slice(0, 3).map(i => {
                          const targetTime = f.co === 'NLB' ? i.estimatedArrivalTime : i.eta;
                          const initialText = getRelativeCountdownTime(targetTime, new Date(), userLang);
                          return `<span class="eta-countdown" data-eta-time="${targetTime || ''}">${initialText}</span>`;
                      }).join(', '); 
                  };
  ```

  For Accordion Drawer rendering inside `updateDrawerETA(d, r, s, manual = false)`:
  Find:
  ```javascript
                  content.style.opacity = '0.5'; setTimeout(() => {
                      content.innerHTML = etas.slice(0, 3).map(i => `<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span style='font-weight:bold'>${getRelativeTime(r.co === 'NLB' ? i.estimatedArrivalTime : i.eta)}</span><span style='font-size:12px;color:#777'>${(r.co === 'NLB' ? (userLang === 'tc' ? i.remark_c : i.remark_e) : localized(i, 'rmk')) || ''}</span></div>`).join('');
                      content.style.opacity = '1';
                  }, 50);
  ```
  Replace with:
  ```javascript
                  content.style.opacity = '0.5'; setTimeout(() => {
                      content.innerHTML = etas.slice(0, 3).map(i => {
                          const targetTime = r.co === 'NLB' ? i.estimatedArrivalTime : i.eta;
                          const initialText = getRelativeCountdownTime(targetTime, new Date(), userLang);
                          return `<div style='display:flex;justify-content:space-between;margin-bottom:4px'><span class="eta-countdown" data-eta-time="${targetTime || ''}" style='font-weight:bold'>${initialText}</span><span style='font-size:12px;color:#777'>${(r.co === 'NLB' ? (userLang === 'tc' ? i.remark_c : i.remark_e) : localized(i, 'rmk')) || ''}</span></div>`;
                      }).join('');
                      content.style.opacity = '1';
                  }, 50);
  ```

- [ ] **Step 2: Run verification unit tests**
  Run: `node test_traffic_map.js && node test_proxy.js`
  Expected: PASS

- [ ] **Step 3: Commit code modifications**
  Run:
  ```bash
  git add bus_all.html
  git commit -m "feat(countdown): store absolute timestamps in eta-countdown datasets"
  ```

---

### Task 4: Set up countdown timer loop & auto-refresh hooks

**Files:**
* Modify: [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html)

- [ ] **Step 1: Write ticking loop logic**
  Set up the global interval in [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html) that executes every `1s` to tick all elements, update the progress bar, and handle automatic/manual refreshes.

  Add the global loop variables and initialization:
  Find:
  ```javascript
          setInterval(() => refreshAllETAs(), 60000);
  ```
  Replace with:
  ```javascript
          // Ticking engine and progress bar manager
          let secondsElapsed = 0;
          const REFRESH_INTERVAL_SEC = 30;

          function tickETACountdowns() {
              const now = new Date();
              document.querySelectorAll('.eta-countdown').forEach(el => {
                  const targetTime = el.getAttribute('data-eta-time');
                  if (targetTime) {
                      el.textContent = getRelativeCountdownTime(targetTime, now, userLang);
                  }
              });
          }

          function resetProgressBar() {
              const bar = document.getElementById('refresh-progress-bar');
              if (bar) {
                  bar.style.transition = 'none';
                  bar.style.width = '0%';
                  // Force reflow
                  bar.offsetHeight;
                  bar.style.transition = 'width 1s linear';
              }
              secondsElapsed = 0;
          }

          function startTickerLoop() {
              // 1. Tick countdowns every second
              setInterval(() => {
                  tickETACountdowns();
                  
                  // 2. Increment and update progress bar
                  secondsElapsed++;
                  const bar = document.getElementById('refresh-progress-bar');
                  if (bar) {
                      const pct = Math.min((secondsElapsed / REFRESH_INTERVAL_SEC) * 100, 100);
                      bar.style.width = `${pct}%`;
                  }

                  // 3. Trigger auto-refresh when limit reached
                  if (secondsElapsed >= REFRESH_INTERVAL_SEC) {
                      refreshAllETAs();
                      resetProgressBar();
                  }
              }, 1000);
          }

          // Override refreshAllETAs to align timer on manual triggers
          const originalRefreshAllETAs = refreshAllETAs;
          refreshAllETAs = async function() {
              resetProgressBar();
              await originalRefreshAllETAs();
          };
  ```

  And update the initialization hook inside the `DOMContentLoaded` event listener:
  Find:
  ```javascript
          document.addEventListener('DOMContentLoaded', async () => {
              if (window.location.protocol === 'file:') {
                  const banner = document.getElementById('local-server-warning');
                  if (banner) banner.classList.remove('hidden');
              }
              try { setupETAObserver(); await BusDB.init(); await migrateFavorites(); await syncRoutes(); updateLabels(); } catch (e) { console.error(e); } finally { const l = document.getElementById('initial-loading'); if (l) l.classList.add('hidden'); updateSortModeUI(); if (gpsEnabled) { const t = document.getElementById('gps-toggle'); if (t) t.checked = true; startGPS(); } else { updateGPSUI(false); } renderFavorites(); }
          });
  ```
  Replace with:
  ```javascript
          document.addEventListener('DOMContentLoaded', async () => {
              if (window.location.protocol === 'file:') {
                  const banner = document.getElementById('local-server-warning');
                  if (banner) banner.classList.remove('hidden');
              }
              try { setupETAObserver(); await BusDB.init(); await migrateFavorites(); await syncRoutes(); updateLabels(); } catch (e) { console.error(e); } finally { const l = document.getElementById('initial-loading'); if (l) l.classList.add('hidden'); updateSortModeUI(); if (gpsEnabled) { const t = document.getElementById('gps-toggle'); if (t) t.checked = true; startGPS(); } else { updateGPSUI(false); } renderFavorites(); startTickerLoop(); }
          });
  ```

- [ ] **Step 2: Run verification unit tests**
  Run: `node test_traffic_map.js && node test_proxy.js`
  Expected: PASS

- [ ] **Step 3: Commit files**
  Run:
  ```bash
  git add bus_all.html
  git commit -m "feat(countdown): wire visual progress bar ticking engine and auto-refresh resets"
  ```

---

### Task 5: E2E Integration Browser Tests

**Files:**
* Modify: [test_playwright_e2e.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_playwright_e2e.js)

- [ ] **Step 1: Write test expectations in E2E suite**
  Add tests validating the progress bar DOM presence, checking that its width increments, and verifying manual trigger reset.

  Add these lines near the end of [test_playwright_e2e.js](file:///home/henry/Documents/GIT/HongKongBusLocal/test_playwright_e2e.js) (before `browser.close()`):
  ```javascript
      // 10. Verify Visual Progress Bar presence
      console.log('Verifying visual refresh progress bar renders...');
      const progressBar = page.locator('#refresh-progress-bar');
      await progressBar.waitFor({ state: 'attached' });
      
      // Let it tick slightly and check width transitions from 0%
      await page.waitForTimeout(2000);
      const widthText = await progressBar.evaluate(el => el.style.width);
      console.log(`Progress bar width style after 2s: "${widthText}"`);
      assert.ok(widthText !== '0%', 'Progress bar should have ticked forward');

      // Click manual refresh button and check progress bar resets to 0%
      console.log('Clicking manual refresh to verify progress bar resets...');
      await page.click('#refresh-btn');
      await page.waitForTimeout(100);
      const widthAfterReset = await progressBar.evaluate(el => el.style.width);
      console.log(`Progress bar width style immediately after manual refresh: "${widthAfterReset}"`);
      assert.strictEqual(widthAfterReset, '0%', 'Progress bar should reset to 0%');
  ```

- [ ] **Step 2: Run all integration tests**
  Run: `node test_playwright_e2e.js`
  Expected: PASS

- [ ] **Step 3: Commit and push**
  Run:
  ```bash
  git add test_playwright_e2e.js
  git commit -m "test(playwright): add E2E assertions for ticking progress bar loading & reset hooks"
  ```
