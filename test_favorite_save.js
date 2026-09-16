const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

function extractScript(htmlContent) {
    const startTag = '<script>';
    const startIndex = htmlContent.indexOf(startTag);
    if (startIndex === -1) throw new Error('Script tag not found');
    const endTag = '</script>';
    const endIndex = htmlContent.indexOf(endTag, startIndex);
    if (endIndex === -1) throw new Error('Closing script tag not found');
    let code = htmlContent.substring(startIndex + startTag.length, endIndex);
    code = code.replace(/const\s+BusDB\s*=/, 'globalThis.BusDB = BusDB =');
    return code;
}

function createDOMEnv(initialGroups = []) {
    const groupsStore = [...initialGroups];
    const favoritesStore = [];
    const elements = new Map();

    const getOrCreateElement = (id) => {
        if (!elements.has(id)) {
            elements.set(id, {
                id,
                value: '',
                textContent: '',
                innerHTML: '',
                dataset: {},
                style: {},
                classList: {
                    _classes: new Set(),
                    add(c) { this._classes.add(c); },
                    remove(c) { this._classes.delete(c); },
                    contains(c) { return this._classes.has(c); },
                    toggle(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); }
                },
                _listeners: new Map(),
                addEventListener(evt, fn) {
                    if (!this._listeners.has(evt)) this._listeners.set(evt, []);
                    this._listeners.get(evt).push(fn);
                },
                querySelector(sel) { return null; },
                querySelectorAll(sel) { return []; },
                appendChild(child) {}
            });
        }
        return elements.get(id);
    };

    const dom = {
        elements,
        groupsStore,
        favoritesStore,
        getOrCreateElement
    };
    return dom;
}

function setupContext(scriptContent, domEnv) {
    const modalContent = { title: '', body: '', footer: '', open: false };
    let alertMessage = null;

    const context = {
        console: { log() {}, error() {}, warn() {} },
        Date,
        Math,
        Set,
        Map,
        Promise,
        setTimeout: (fn) => fn(),
        clearTimeout() {},
        setInterval: () => 1,
        clearInterval() {},
        alert: (msg) => { alertMessage = msg; },
        navigator: { language: 'zh-HK' },
        localStorage: {
            _store: new Map(),
            getItem(k) { return this._store.get(k) || null; },
            setItem(k, v) { this._store.set(k, String(v)); },
            removeItem(k) { this._store.delete(k); },
            clear() { this._store.clear(); }
        },
        window: {
            addEventListener: () => {},
            removeEventListener: () => {},
            location: { protocol: 'file:' }
        },
        document: {
            visibilityState: 'visible',
            getElementById: (id) => domEnv.getOrCreateElement(id),
            querySelector: (sel) => domEnv.getOrCreateElement('query-result'),
            querySelectorAll: (sel) => [],
            createElement: (tag) => {
                const el = domEnv.getOrCreateElement(`elem-${Math.random()}`);
                el.tagName = tag.toUpperCase();
                return el;
            },
            addEventListener: () => {},
            removeEventListener: () => {}
        },
        openGenericModal: (title, body, footer) => {
            modalContent.title = title;
            modalContent.body = body;
            modalContent.footer = footer;
            modalContent.open = true;
        },
        closeGenericModal: () => {
            modalContent.open = false;
        },
        renderFavorites: () => {},
        showHome: () => {},
        localized: (obj, key) => obj[`${key}_tc`] || obj[`${key}_en`] || '',
        t: (k) => k,
        activeGroupId: 1
    };
    context.globalThis = context;
    context.window = context;

    // BusDB mock
    context.BusDB = {
        getAll: async (table) => {
            if (table === 'favorite_groups') return [...domEnv.groupsStore];
            if (table === 'favorites') return [...domEnv.favoritesStore];
            return [];
        },
        put: async (table, item) => {
            if (table === 'favorite_groups') {
                const id = item.id || (domEnv.groupsStore.length > 0 ? Math.max(...domEnv.groupsStore.map(g => g.id || 0)) + 1 : 1);
                const toSave = { ...item, id };
                const idx = domEnv.groupsStore.findIndex(g => g.id === id);
                if (idx >= 0) domEnv.groupsStore[idx] = toSave;
                else domEnv.groupsStore.push(toSave);
                return id;
            }
            if (table === 'favorites') {
                const favId = item.favId || (domEnv.favoritesStore.length > 0 ? Math.max(...domEnv.favoritesStore.map(f => f.favId || 0)) + 1 : 1);
                const toSave = { ...item, favId };
                const idx = domEnv.favoritesStore.findIndex(f => f.favId === favId);
                if (idx >= 0) domEnv.favoritesStore[idx] = toSave;
                else domEnv.favoritesStore.push(toSave);
                return favId;
            }
            return null;
        },
        putAll: async (table, items) => {
            for (const item of items) {
                await context.BusDB.put(table, item);
            }
        },
        delete: async (table, id) => {
            if (table === 'favorite_groups') {
                const idx = domEnv.groupsStore.findIndex(g => g.id === id);
                if (idx >= 0) domEnv.groupsStore.splice(idx, 1);
            }
            if (table === 'favorites') {
                const idx = domEnv.favoritesStore.findIndex(f => f.favId === id);
                if (idx >= 0) domEnv.favoritesStore.splice(idx, 1);
            }
        }
    };

    vm.createContext(context);
    vm.runInContext(scriptContent, context);

    return { context, modalContent, getAlert: () => alertMessage };
}

test('Favorite Group & Add to Favorite Test Suite', async (t) => {
    const htmlFiles = ['bus.html', 'bus_all.html', 'index.html'];

    for (const fileName of htmlFiles) {
        await t.test(`${fileName}: createNewGroupAndSave does NOT throw TypeError on empty groups`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const script = extractScript(html);
            const domEnv = createDOMEnv([]); // initially EMPTY favorite_groups

            const { context } = setupContext(script, domEnv);

            // Prepare context for saving a favorite
            const sampleRoute = { co: 'KMB', route: '101', service_type: 1, routeId: '101-1', bound: 'O', direction: 'outbound', orig_tc: '觀塘', dest_tc: '堅尼地城' };
            const sampleStop = { stop: '12345', name_tc: '創紀之城', name_en: 'Millennium City' };

            // Open group selector
            await context.showGroupSelector(sampleRoute, sampleStop);

            // Set new group name in input
            const input = domEnv.getOrCreateElement('new-group-input');
            input.value = '上班路線';

            // Call createNewGroupAndSave
            // Before fix, this throws: TypeError: Reduce of empty array with no initial value (or if getAll is empty)
            let error = null;
            try {
                await context.createNewGroupAndSave();
            } catch (err) {
                error = err;
            }

            assert.strictEqual(error, null, `createNewGroupAndSave should not throw error, got: ${error?.message}`);
            const groupsInDb = await context.BusDB.getAll('favorite_groups');
            assert.ok(groupsInDb.length >= 1, 'favorite_groups should contain the created group');
            const createdGroup = groupsInDb.find(g => g.name_tc === '上班路線');
            assert.ok(createdGroup, 'Created group should exist in favorite_groups store');
            assert.ok(createdGroup.id, 'Created group must have a valid numeric id');

            // Favorite should be saved with the new group's id
            const favsInDb = await context.BusDB.getAll('favorites');
            assert.ok(favsInDb.length >= 1, 'favorites store should contain the newly saved favorite');
            assert.strictEqual(favsInDb[0].groupId, createdGroup.id);
        });

        await t.test(`${fileName}: createNewGroupAndSave moves existing favorite when _currentMoveContext is set`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const script = extractScript(html);
            const domEnv = createDOMEnv([]);

            const { context } = setupContext(script, domEnv);

            const existingFav = { favId: 99, co: 'KMB', route: '101', stopId: '123', groupId: 1 };
            await context.BusDB.put('favorites', existingFav);

            await context.showGroupSelector(null, null, existingFav);

            const input = domEnv.getOrCreateElement('new-group-input');
            input.value = '新群組';

            await context.createNewGroupAndSave();

            const groupsInDb = await context.BusDB.getAll('favorite_groups');
            const newGroup = groupsInDb.find(g => g.name_tc === '新群組');
            assert.ok(newGroup, 'New group should be created');

            const favsInDb = await context.BusDB.getAll('favorites');
            const updated = favsInDb.find(f => f.favId === 99);
            assert.ok(updated, 'Existing favorite should be found');
            assert.strictEqual(updated.groupId, newGroup.id, 'Favorite groupId should be updated to new group id');
        });

        await t.test(`${fileName}: showGroupSelector self-heals empty groups with default groups`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const script = extractScript(html);
            const domEnv = createDOMEnv([]); // Empty groups

            const { context } = setupContext(script, domEnv);

            const sampleRoute = { co: 'KMB', route: '101' };
            const sampleStop = { stop: '12345', name_tc: '創紀之城', name_en: 'Millennium City' };

            await context.showGroupSelector(sampleRoute, sampleStop);

            const modal = domEnv.getOrCreateElement('generic-modal');
            const body = domEnv.getOrCreateElement('g-modal-body');

            assert.strictEqual(modal.classList.contains('hidden'), false, 'generic-modal should not be hidden');
            assert.ok(
                body.innerHTML.includes('去程') || body.innerHTML.includes('Outgoing'),
                'Modal should display default groups when groups were initially empty'
            );
        });
    }

    // Test apostrophe safety in stop search for bus.html and bus_all.html
    for (const fileName of ['bus.html', 'bus_all.html']) {
        await t.test(`${fileName}: stop cards with apostrophes in station name do not produce syntax errors`, () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            // Check that stop card template does not inject unescaped s.name_en or s.name_tc into inline onclick
            // Or better: ensure quotes are escaped or handled cleanly
            const hasRawInterpolation = /onclick="handleStopRouteFavorite\(event,\s*'\$\{s\.co\}',\s*'\$\{s\.stopId\}',\s*'\$\{r\.route\}',\s*\$\{st\},\s*'\$\{s\.name_tc\}',\s*'\$\{s\.name_en\}'/.test(html);
            assert.strictEqual(
                hasRawInterpolation,
                false,
                `${fileName} should not use unescaped inline string interpolation for stop names with potential apostrophes`
            );
        });
    }
});
