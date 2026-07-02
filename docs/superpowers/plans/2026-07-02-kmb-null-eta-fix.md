# KMB Null ETA Display Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ETA display in `bus.html` and `bus_all.html` so that when KMB returns `null` for `eta` (e.g. Route 234D), the UI displays "暫無預計到站時間" / "No ETA" instead of "預定班次" / "Scheduled".

**Architecture:** Update `getRelativeTime` in `bus.html` and `getRelativeCountdownTime` in `bus_all.html` to return `t('noETA')` / "No ETA" when the target timestamp string is null, empty, or unparseable.

**Tech Stack:** Plain HTML5, JavaScript (ES6+), Vanilla CSS.

---

### Task 1: Update `getRelativeTime` in `bus.html`

**Files:**
- Modify: `bus.html:1738`

- [ ] **Step 1: Locate `getRelativeTime` function in `bus.html`**

Open `bus.html` at line 1738.

- [ ] **Step 2: Modify `getRelativeTime` implementation**

Replace line 1738:
```javascript
function getRelativeTime(s) { if (!s) return t('scheduled'); const d = Math.floor((new Date(s.replace(' ', 'T')) - new Date()) / 60000); return d <= 0 ? `0 ${t('min')}` : `${d} ${t('min')}`; }
```
With:
```javascript
function getRelativeTime(s) { if (!s) return t('noETA'); const d = Math.floor((new Date(s.replace(' ', 'T')) - new Date()) / 60000); return d <= 0 ? `0 ${t('min')}` : `${d} ${t('min')}`; }
```

- [ ] **Step 3: Verify syntax in `bus.html`**

Check that there are no syntax errors in `bus.html`.

- [ ] **Step 4: Commit changes**

```bash
git add bus.html
git commit -m "fix(eta): display noETA instead of scheduled when ETA timestamp is null in bus.html"
```

---

### Task 2: Update `getRelativeCountdownTime` in `bus_all.html`

**Files:**
- Modify: `bus_all.html:238-250`

- [ ] **Step 1: Locate `getRelativeCountdownTime` in `bus_all.html`**

Open `bus_all.html` at lines 238-250.

- [ ] **Step 2: Modify `getRelativeCountdownTime` implementation**

Replace lines 238-249:
```javascript
        function getRelativeCountdownTime(targetTimeStr, nowObj, locale) {
            if (!targetTimeStr) return locale === 'tc' ? '預定班次' : 'Scheduled';
            
            const normalized = targetTimeStr.replace(' ', 'T');
            let target;
            if (!normalized.endsWith('Z') && !normalized.includes('+') && normalized.indexOf('-', 11) === -1) {
                target = new Date(normalized + '+08:00');
            } else {
                target = new Date(normalized);
            }
            
            if (isNaN(target.getTime())) return locale === 'tc' ? '預定班次' : 'Scheduled';
```

With:
```javascript
        function getRelativeCountdownTime(targetTimeStr, nowObj, locale) {
            if (!targetTimeStr) return locale === 'tc' ? '暫無預計到站時間' : 'No ETA';
            
            const normalized = targetTimeStr.replace(' ', 'T');
            let target;
            if (!normalized.endsWith('Z') && !normalized.includes('+') && normalized.indexOf('-', 11) === -1) {
                target = new Date(normalized + '+08:00');
            } else {
                target = new Date(normalized);
            }
            
            if (isNaN(target.getTime())) return locale === 'tc' ? '暫無預計到站時間' : 'No ETA';
```

- [ ] **Step 3: Commit changes**

```bash
git add bus_all.html
git commit -m "fix(eta): display No ETA instead of Scheduled when ETA timestamp is null in bus_all.html"
```
