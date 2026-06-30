# Design Spec: Live Ticking ETA & Auto-Refresh Progress Bar

This specification outlines the architecture, layout, and implementation details for integrating dynamic live-ticking ETA countdown badges and an automatic 30-second refresh cycle with a visual progress bar into [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html).

---

## 1. Objectives & Constraints
* **High Performance**: Use a single centralized JavaScript loop (`setInterval` at 1s) to scan and update visible countdown badges. Avoid full-card DOM rerendering to keep CPU overhead under `0.1%`.
* **Clean Visual Style**: Keep the interface simple and uncluttered. Avoid intrusive UI elements. Integrate the refresh progress bar seamlessly as a subtle highlight line in the existing header.
* **Localization Friendly**: Fully support Traditional Chinese (tc) and English (en) labels matching user language preference.
* **Isolation**: All modifications are strictly contained within [bus_all.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus_all.html). [bus.html](file:///home/henry/Documents/GIT/HongKongBusLocal/bus.html) remains untouched and identical to the `master` branch.

---

## 2. Dynamic Countdown Badges

### 2.1 DOM Attributes
Instead of static formatted ETA text, each ETA badge element will expose a `data-eta-time` attribute containing the ISO-8601 target arrival timestamp returned by the bus API:
```html
<span class="eta-countdown" data-eta-time="2026-06-30T12:45:00.000Z">...</span>
```

### 2.2 Global Countdown Engine
A single global interval updates all visible `.eta-countdown` elements every `1,000ms`:
1. Parse the target timestamp `T` from `data-eta-time`.
2. Compute the delta: $\text{diff} = T - \text{now}$.
3. Format output:
   * **Traditional Chinese (tc)**:
     * If $\text{diff} \ge 60\text{s}$: `X分Y秒` (e.g. `12分45秒`)
     * If $0\text{s} < \text{diff} < 60\text{s}$: `Y秒` (e.g. `45秒`)
     * If $\text{diff} \le 0\text{s}$: `0分0秒` (or `已到站` / `Arrived`)
   * **English (en)**:
     * If $\text{diff} \ge 60\text{s}$: `Xm Ys` (e.g. `12m 45s`)
     * If $0\text{s} < \text{diff} < 60\text{s}$: `Ys` (e.g. `45s`)
     * If $\text{diff} \le 0\text{s}$: `0m 0s`
4. If the badge has no valid timestamp (e.g. it is a scheduled run with fallback static remark), the ticker ignores it and preserves the static remark.

---

## 3. Auto-Refresh Progress Bar

### 3.1 Layout & Visual Style
Add a slim horizontal bar container inside the existing `<header>` element:
```html
<div id="refresh-progress-bar" style="position: absolute; bottom: 0; left: 0; height: 3px; background: rgba(255, 255, 255, 0.7); width: 0%; transition: width 1s linear;"></div>
```

### 3.2 30-Second Refresh Logic
* A variable tracks elapsed seconds: `secondsElapsed` (0 to 30).
* Every `1s`, `secondsElapsed` increments. The progress bar's CSS width is updated:
  $$\text{width} = \left(\frac{\text{secondsElapsed}}{30}\right) \times 100\%$$
* When `secondsElapsed` reaches `30`:
  1. Trigger `refreshAllETAs()` in the background.
  2. Instantly reset progress bar's width to `0%` by temporarily applying `transition: none` to avoid slide-back animation.
  3. Reset `secondsElapsed` to 0.

### 3.3 Manual Sync
If the user clicks the manual refresh button (`#refresh-btn`):
1. Immediately cancel the current interval.
2. Trigger the refresh call `refreshAllETAs()`.
3. Reset `secondsElapsed` to 0 and update the progress bar width to `0%`.
4. Restart the 30-second interval cycle.

---

## 4. Test Verification Plan
* **Unit Tests**: Add tests verifying coordinate geometry, math transformations, and the `data-eta-time` formatting function under Chinese and English locales.
* **E2E Playwright Tests**: Update the test automation suite to verify:
  * Progress bar renders inside `<header>`.
  * Manual refresh resets the timer bar.
  * Ticking badges update their text content over time.
