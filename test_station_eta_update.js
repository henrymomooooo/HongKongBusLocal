const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

// Helper to extract the main <script> content from HTML
function extractScript(htmlContent) {
    const startTag = '<script>';
    const startIndex = htmlContent.indexOf(startTag);
    if (startIndex === -1) throw new Error('Script tag not found');
    const endTag = '</script>';
    const endIndex = htmlContent.indexOf(endTag, startIndex);
    if (endIndex === -1) throw new Error('Closing script tag not found');
    let code = htmlContent.substring(startIndex + startTag.length, endIndex);
    code = code.replace(/const\s+BusAPI\s*=/, 'globalThis.BusAPI = BusAPI =');
    return code;
}

function createContext(overrides = {}) {
    const storage = new Map();
    const context = {
        console: { log() {}, error() {}, warn() {} },
        Date,
        Math,
        Set,
        Map,
        Promise,
        setTimeout,
        clearTimeout,
        setInterval: () => 1,
        clearInterval: () => {},
        localStorage: {
            getItem: (k) => storage.get(k) || null,
            setItem: (k, v) => storage.set(k, String(v)),
            removeItem: (k) => storage.delete(k)
        },
        navigator: {
            language: 'zh-HK',
            geolocation: {
                watchPosition: () => 1,
                clearWatch: () => {}
            },
            clipboard: { writeText: async () => {} }
        },
        window: {
            location: { protocol: 'file:' }
        },
        location: { protocol: 'file:' },
        document: {
            visibilityState: 'visible',
            createElement: (tag) => ({
                tagName: tag,
                className: '',
                style: {},
                classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
                textContent: '',
                innerHTML: '',
                querySelector: () => null,
                querySelectorAll: () => [],
                appendChild() {},
                addEventListener: () => {}
            }),
            getElementById: (id) => ({
                classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
                textContent: '',
                innerHTML: '',
                style: {},
                querySelector: () => null,
                querySelectorAll: () => [],
                appendChild: () => {},
                addEventListener: () => {}
            }),
            querySelector: () => ({
                addEventListener: () => {}
            }),
            querySelectorAll: () => [],
            addEventListener: () => {}
        },
        BusDB: {
            getAll: async () => [],
            get: async () => null,
            put: async () => {},
            delete: async () => {},
            init: async () => {}
        },
        activeGroupId: 1,
        _visibleFavIds: new Set(),
        ...overrides
    };
    context.globalThis = context;
    context.window = { ...context.window, ...context };
    vm.createContext(context);
    return context;
}

test('Station Drawer ETA Auto-Update Test Suite', async (t) => {
    const busHtml = fs.readFileSync(path.join(__dirname, 'bus.html'), 'utf8');
    const busAllHtml = fs.readFileSync(path.join(__dirname, 'bus_all.html'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    await t.test('bus.html: refreshAllETAs must not clear _drawerInterval', () => {
        const match = /async function refreshAllETAs\s*\([^)]*\)[\s\S]*?\{([\s\S]*?)\}/.exec(busHtml);
        assert.ok(match, 'refreshAllETAs function should exist in bus.html');
        assert.strictEqual(
            match[1].includes('_drawerInterval'),
            false,
            'refreshAllETAs in bus.html must NOT contain _drawerInterval'
        );
    });

    await t.test('index.html: refreshAllETAs must not clear _drawerInterval', () => {
        const match = /async function refreshAllETAs\s*\([^)]*\)[\s\S]*?\{([\s\S]*?)\}/.exec(indexHtml);
        assert.ok(match, 'refreshAllETAs function should exist in index.html');
        assert.strictEqual(
            match[1].includes('_drawerInterval'),
            false,
            'refreshAllETAs in index.html must NOT contain _drawerInterval'
        );
    });

    await t.test('bus.html: updateDrawerETA releases lock on network error (try...finally)', async () => {
        const scriptCode = extractScript(busHtml);
        const context = createContext();
        vm.runInContext(scriptCode, context);

        let callCount = 0;
        context.BusAPI.getETA = async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error('Network timeout');
            }
            return [{ eta: new Date(Date.now() + 60000).toISOString() }];
        };

        const contentEl = { textContent: '', innerHTML: '', style: {} };
        const statusEl = { textContent: '', innerHTML: '', style: {}, querySelector: () => null, appendChild() {} };
        const mockDrawer = {
            querySelector: (sel) => sel === '.eta-content' ? contentEl : statusEl
        };

        const mockRoute = { co: 'KMB', route: '1A', service_type: 1, bound: 'O' };
        const mockStop = { stop: 'TST-1' };

        // First call fails
        try {
            await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);
        } catch (e) {}

        // Second call should NOT be blocked by _drawerFetching lock
        await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);

        assert.strictEqual(
            callCount,
            2,
            'Expected updateDrawerETA to retry and reach BusAPI.getETA on second call after first call failed'
        );
    });

    await t.test('bus_all.html: updateDrawerETA releases lock on network error (try...finally)', async () => {
        const scriptCode = extractScript(busAllHtml);
        const context = createContext();
        vm.runInContext(scriptCode, context);

        let callCount = 0;
        context.BusAPI.getETA = async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error('Network timeout');
            }
            return [{ eta: new Date(Date.now() + 60000).toISOString() }];
        };

        const contentEl = { textContent: '', innerHTML: '', style: {} };
        const statusEl = { textContent: '', innerHTML: '', style: {}, querySelector: () => null, appendChild() {} };
        const mockDrawer = {
            querySelector: (sel) => sel === '.eta-content' ? contentEl : statusEl
        };

        const mockRoute = { co: 'KMB', route: '1A', service_type: 1, bound: 'O' };
        const mockStop = { stop: 'TST-1' };

        try {
            await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);
        } catch (e) {}

        await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);

        assert.strictEqual(
            callCount,
            2,
            'Expected bus_all.html updateDrawerETA to retry on second call after first call failed'
        );
    });

    await t.test('index.html: updateDrawerETA releases lock on network error (try...finally)', async () => {
        const scriptCode = extractScript(indexHtml);
        const context = createContext();
        vm.runInContext(scriptCode, context);

        let callCount = 0;
        context.BusAPI.getETA = async () => {
            callCount++;
            if (callCount === 1) {
                throw new Error('Network timeout');
            }
            return [{ eta: new Date(Date.now() + 60000).toISOString() }];
        };

        const contentEl = { textContent: '', innerHTML: '', style: {} };
        const statusEl = { textContent: '', innerHTML: '', style: {}, querySelector: () => null, appendChild() {} };
        const mockDrawer = {
            querySelector: (sel) => sel === '.eta-content' ? contentEl : statusEl
        };

        const mockRoute = { co: 'KMB', route: '1A', service_type: 1, bound: 'O' };
        const mockStop = { stop: 'TST-1' };

        try {
            await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);
        } catch (e) {}

        await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);

        assert.strictEqual(
            callCount,
            2,
            'Expected index.html updateDrawerETA to retry on second call after first call failed'
        );
    });

    await t.test('bus.html: updateDrawerETA renders eta-countdown with data-eta-time and ticks down', async () => {
        const futureEta = new Date(Date.now() + 120000).toISOString();
        const scriptCode = extractScript(busHtml);
        const context = createContext({
            userLang: 'en'
        });
        vm.runInContext(scriptCode, context);

        context.BusAPI.getETA = async () => [
            { eta: futureEta, rmk_tc: '預定班次', rmk_en: 'Scheduled' }
        ];

        let renderedHTML = '';
        const contentEl = {
            textContent: '',
            get innerHTML() { return renderedHTML; },
            set innerHTML(v) { renderedHTML = v; },
            style: {}
        };
        const statusEl = { textContent: '', innerHTML: '', style: {}, querySelector: () => null, appendChild() {} };
        const mockDrawer = {
            querySelector: (sel) => sel === '.eta-content' ? contentEl : statusEl
        };

        const mockRoute = { co: 'KMB', route: '1A', service_type: 1, bound: 'O' };
        const mockStop = { stop: 'TST-1' };

        await context.updateDrawerETA(mockDrawer, mockRoute, mockStop);
        await new Promise(r => setTimeout(r, 100));

        assert.ok(
            renderedHTML.includes('class="eta-countdown"') || renderedHTML.includes("class='eta-countdown'"),
            'Expected drawer ETA output to contain class "eta-countdown"'
        );
        assert.ok(
            renderedHTML.includes('data-eta-time'),
            'Expected drawer ETA output to have attribute data-eta-time'
        );
        assert.ok(
            typeof context.tickETACountdowns === 'function',
            'Expected tickETACountdowns function to exist in bus.html'
        );
    });

    await t.test('bus.html: getRelativeCountdownTime formats time correctly in tc and en', () => {
        const scriptCode = extractScript(busHtml);
        const context = createContext();
        vm.runInContext(scriptCode, context);

        assert.strictEqual(typeof context.getRelativeCountdownTime, 'function', 'getRelativeCountdownTime should be defined');

        const now = new Date('2026-09-16T12:00:00+08:00');
        const in2Min = new Date('2026-09-16T12:02:15+08:00').toISOString();
        const in30Sec = new Date('2026-09-16T12:00:30+08:00').toISOString();
        const past = new Date('2026-09-16T11:59:00+08:00').toISOString();

        assert.strictEqual(context.getRelativeCountdownTime(in2Min, now, 'tc'), '2分15秒');
        assert.strictEqual(context.getRelativeCountdownTime(in2Min, now, 'en'), '2m 15s');
        assert.strictEqual(context.getRelativeCountdownTime(in30Sec, now, 'tc'), '30秒');
        assert.strictEqual(context.getRelativeCountdownTime(in30Sec, now, 'en'), '30s');
        assert.strictEqual(context.getRelativeCountdownTime(past, now, 'tc'), '已到站');
        assert.strictEqual(context.getRelativeCountdownTime(past, now, 'en'), 'Arrived');
        assert.strictEqual(context.getRelativeCountdownTime('', now, 'tc'), '暫無預計到站時間');
        assert.strictEqual(context.getRelativeCountdownTime('', now, 'en'), 'No ETA');
    });
});
