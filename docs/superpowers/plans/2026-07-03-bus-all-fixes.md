# Implementation Plan: bus_all.html Bug Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix CCTV image domain URLs, inbound stop favoriting direction preservation, and CTB swap direction English name fallbacks in `bus_all.html` and test scripts.

**Architecture:** Update `tdcctv.data.gov.hk` to `tdcctv.data.one.gov.hk`, update `handleStopRouteFavorite` to match and set bound/direction properly, and add string fallbacks for CTB `swapDirection`.

**Tech Stack:** Plain HTML5, JavaScript (ES6+), Playwright.

---

### Task 1: Fix CCTV Domain URLs

**Files:**
- Modify: `bus_all.html:273,763,1763`
- Modify: `test_playwright_e2e.js:148,281`
- Modify: `test_visual.js:113`

- [ ] **Step 1: Replace CCTV URL in `bus_all.html`**
Replace `https://tdcctv.data.gov.hk/` with `https://tdcctv.data.one.gov.hk/` across lines 273, 763, and 1763 in `bus_all.html`.

- [ ] **Step 2: Replace CCTV URL in test files**
Replace `https://tdcctv.data.gov.hk/` with `https://tdcctv.data.one.gov.hk/` in `test_playwright_e2e.js` and `test_visual.js`.

- [ ] **Step 3: Commit Task 1**
```bash
git add bus_all.html test_playwright_e2e.js test_visual.js
git commit -m "fix(cctv): update CCTV base domain to tdcctv.data.one.gov.hk"
```

---

### Task 2: Fix Inbound Stop Favoriting Direction in `bus_all.html`

**Files:**
- Modify: `bus_all.html:1601-1605`

- [ ] **Step 1: Update `handleStopRouteFavorite` in `bus_all.html`**

Replace:
```javascript
            } else {
                const r = allRoutes.find(x => x.co === co && x.route === route && (x.service_type || 1) === serviceType) || {
                    co, route, service_type: serviceType, routeId, bound, dest_tc: '', dest_en: ''
                };
                const s = { stop: stopId, name_tc: stopName_tc, name_en: stopName_en };
```
With:
```javascript
            } else {
                let r = allRoutes.find(x => x.co === co && x.route === route && (x.service_type || 1) === serviceType && (!bound || x.bound === bound));
                if (!r) r = allRoutes.find(x => x.co === co && x.route === route && (x.service_type || 1) === serviceType);
                r = r ? { ...r } : { co, route, service_type: serviceType, routeId, bound, dest_tc: '', dest_en: '' };
                if (bound) {
                    r.bound = bound;
                    r.direction = (bound === 'I' || bound === 'inbound') ? 'inbound' : 'outbound';
                }
                const s = { stop: stopId, name_tc: stopName_tc, name_en: stopName_en };
```

- [ ] **Step 2: Commit Task 2**
```bash
git add bus_all.html
git commit -m "fix(favorites): preserve inbound bound and direction when favoriting from stop search"
```

---

### Task 3: Fix CTB Swap Direction English Name in `bus_all.html`

**Files:**
- Modify: `bus_all.html:1662`

- [ ] **Step 1: Update `swapDirection` in `bus_all.html`**

Replace line 1662:
```javascript
            else if (curr.co === 'CTB') { const td = curr.direction === 'outbound' ? 'inbound' : 'outbound', s = await BusAPI.fetchCTB(`/route-stop/CTB/${curr.route}/${td}`); if (s?.length > 0) opps = [{...curr, direction: td, dest_tc: curr.orig_tc, orig_tc: curr.dest_tc, dest_en: curr.orig_en, orig_en: curr.dest_en}]; }
```
With:
```javascript
            else if (curr.co === 'CTB') { const td = curr.direction === 'outbound' ? 'inbound' : 'outbound', s = await BusAPI.fetchCTB(`/route-stop/CTB/${curr.route}/${td}`); if (s?.length > 0) opps = [{...curr, direction: td, dest_tc: curr.orig_tc || curr.dest_tc || '', orig_tc: curr.dest_tc || curr.orig_tc || '', dest_en: curr.orig_en || curr.dest_en || '', orig_en: curr.dest_en || curr.orig_en || ''}]; }
```

- [ ] **Step 2: Commit Task 3**
```bash
git add bus_all.html
git commit -m "fix(ctb): provide fallbacks for orig_en and dest_en when swapping CTB direction"
```

---

### Task 4: Automated Verification

- [ ] **Step 1: Run scratch unit verification script**
Run `/home/henry/.cache/ms-playwright-go/1.57.0/node scratch/unit_test_bug.js` and verify it passes.
