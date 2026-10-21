const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

// Helper to extract a function definition from HTML content
function extractFunction(htmlContent, functionName) {
    const startTag = `async function ${functionName}(` ;
    const startIndex = htmlContent.indexOf(startTag);
    if (startIndex === -1) {
        throw new Error(`Function ${functionName} not found in HTML`);
    }

    let braceCount = 0;
    let index = startIndex;
    while (index < htmlContent.length) {
        if (htmlContent[index] === '{') braceCount++;
        else if (htmlContent[index] === '}') {
            braceCount--;
            if (braceCount === 0) {
                index++;
                break;
            }
        }
        index++;
    }
    return htmlContent.substring(startIndex, index);
}

// Helper to create a test environment simulating the DOM during showStops
function createTestEnv(htmlContent) {
    const showStopsCode = extractFunction(htmlContent, 'showStops');
    const selectRouteCode = extractFunction(htmlContent, 'selectRoute');

    class MockElement {
        constructor(id) {
            this.id = id;
            this._innerHTML = '';
            this.children = [];
            this.classList = {
                classes: new Set(),
                add: (c) => this.classList.classes.add(c),
                remove: (c) => this.classList.classes.delete(c),
                contains: (c) => this.classList.classes.has(c)
            };
        }

        get innerHTML() {
            return this._innerHTML;
        }

        set innerHTML(val) {
            this._innerHTML = val;
        }

        appendChild(child) {
            this.children.push(child);
        }

        querySelector(sel) {
            if (sel === '.back-btn' || sel === 'button.back-btn') {
                if (this._innerHTML.includes("class='back-btn'") || this._innerHTML.includes('class="back-btn"')) {
                    return new MockElement('back-btn');
                }
                return null;
            }
            if (sel === '#swap-dir-btn') {
                if (this._innerHTML.includes("id='swap-dir-btn'") || this._innerHTML.includes('id="swap-dir-btn"')) {
                    return new MockElement('swap-dir-btn');
                }
                return null;
            }
            if (sel === '#retry-stops-btn') {
                if (this._innerHTML.includes("id='retry-stops-btn'") || this._innerHTML.includes('id="retry-stops-btn"')) {
                    return new MockElement('retry-stops-btn');
                }
                return null;
            }
            if (sel === '#retry-dir-btn') {
                if (this._innerHTML.includes("id='retry-dir-btn'") || this._innerHTML.includes('id="retry-dir-btn"')) {
                    return new MockElement('retry-dir-btn');
                }
                return null;
            }
            if (sel === '#stops-loading-container') {
                if (this._innerHTML.includes("id='stops-loading-container'") || this._innerHTML.includes('id="stops-loading-container"')) {
                    const el = new MockElement('stops-loading-container');
                    el.remove = () => {};
                    return el;
                }
                return null;
            }
            return null;
        }
    }

    const elements = {
        'search-input-area': new MockElement('search-input-area'),
        'route-results': new MockElement('route-results'),
        'favorites-section': new MockElement('favorites-section'),
        'stop-selection-results': new MockElement('stop-selection-results')
    };

    const sResults = elements['stop-selection-results'];

    let getStopsPromiseResolve = null;
    let getStopsPromiseReject = null;
    let getStopsCalled = false;

    const mockBusAPI = {
        getStops: () => {
            getStopsCalled = true;
            return new Promise((resolve, reject) => {
                getStopsPromiseResolve = resolve;
                getStopsPromiseReject = reject;
            });
        },
        fetchCTB: () => Promise.resolve([])
    };

    const context = {
        document: {
            getElementById: (id) => elements[id] || new MockElement(id),
            createElement: (tag) => new MockElement(tag)
        },
        window: {},
        BusAPI: mockBusAPI,
        t: (key) => key === 'back' ? '返回' : key,
        localized: (obj, field) => obj[field] || '',
        allRoutes: [],
        gpsEnabled: false,
        userCoords: null,
        _isFavorited: () => false,
        swapDirection: () => {},
        showHome: () => {},
        setTimeout: (fn) => setTimeout(fn, 0)
    };

    vm.createContext(context);
    vm.runInContext(showStopsCode, context);
    vm.runInContext(selectRouteCode, context);

    return {
        context,
        sResults,
        triggerStopsResolve: (data) => getStopsPromiseResolve(data),
        triggerStopsReject: (err) => getStopsPromiseReject(err)
    };
}

test('Back Button Immediate Availability Test', async (t) => {
    const filesToTest = ['bus.html', 'bus_all.html', 'index.html'];

    for (const fileName of filesToTest) {
        await t.test(`${fileName}: renders back button immediately during showStops loading`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const env = createTestEnv(html);

            const routeObj = {
                co: 'KMB',
                route: '1A',
                bound: 'O',
                dest: '尖沙咀碼頭',
                service_type: 1
            };

            // Call showStops (asynchronous, will wait on mock BusAPI.getStops)
            const showStopsPromise = env.context.showStops(routeObj);

            // IMMEDIATE CHECK (before API promise resolves):
            // Back button MUST be present in stop-selection-results right now!
            const backBtnDuringLoading = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnDuringLoading, `Expected back button to be rendered immediately during loading in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('showHome()'), `Expected back button to have onclick showHome() in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('loadingStops'), `Expected loading indicator in ${fileName}`);

            // Now resolve the stops API
            env.triggerStopsResolve([
                { stop: 'S1', name: 'Stop 1' },
                { stop: 'S2', name: 'Stop 2' }
            ]);
            await showStopsPromise;

            // AFTER LOADING CHECK:
            const backBtnAfterLoading = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnAfterLoading, `Expected back button to be present after loading in ${fileName}`);
        });

        await t.test(`${fileName}: preserves back button even if showStops fails`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const env = createTestEnv(html);

            const routeObj = {
                co: 'KMB',
                route: '1A',
                bound: 'O',
                dest: '尖沙咀碼頭',
                service_type: 1
            };

            const showStopsPromise = env.context.showStops(routeObj);

            // Reject with network error
            env.triggerStopsReject(new Error('Network failure'));
            await showStopsPromise;

            // ERROR STATE CHECK:
            // Back button MUST still be present so user isn't stuck!
            const backBtnOnError = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnOnError, `Expected back button to remain present on error in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('failedStops'), `Expected failed message in ${fileName}`);
            const retryBtnOnError = env.sResults.querySelector('#retry-stops-btn');
            assert.ok(retryBtnOnError, `Expected retry button on error in ${fileName}`);
        });

        await t.test(`${fileName}: renders error and retry button when getStops returns empty array`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const env = createTestEnv(html);

            const routeObj = {
                co: 'KMB',
                route: '1A',
                bound: 'O',
                dest: '尖沙咀碼頭',
                service_type: 1
            };

            const showStopsPromise = env.context.showStops(routeObj);

            // Resolve with empty array (simulating silent API/proxy failure)
            env.triggerStopsResolve([]);
            await showStopsPromise;

            const backBtnOnEmpty = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnOnEmpty, `Expected back button to remain present on empty stops in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('failedStops'), `Expected failedStops message when stops is empty in ${fileName}`);
            const retryBtnOnEmpty = env.sResults.querySelector('#retry-stops-btn');
            assert.ok(retryBtnOnEmpty, `Expected retry button when stops is empty in ${fileName}`);
        });

        await t.test(`${fileName}: renders back button immediately during selectRoute loading and error`, async () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            const env = createTestEnv(html);

            let fetchCTBResolve;
            let fetchCTBReject;
            env.context.BusAPI.fetchCTB = () => new Promise((resolve, reject) => {
                fetchCTBResolve = resolve;
                fetchCTBReject = reject;
            });

            const routeObj = {
                co: 'CTB',
                route: '720',
                dest: '中環',
                orig: '嘉亨灣'
            };

            // Call selectRoute (asynchronous CTB inbound check)
            const selectRoutePromise = env.context.selectRoute(routeObj);

            // IMMEDIATE CHECK:
            const backBtnDuringLoading = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnDuringLoading, `Expected back button to be rendered immediately during selectRoute loading in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('showHome()'), `Expected back button to have onclick showHome() in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('loadingDirections'), `Expected loading indicator in ${fileName}`);

            // Resolve
            fetchCTBResolve([{ stop: 'S1' }]);
            await selectRoutePromise;

            const backBtnAfterLoading = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnAfterLoading, `Expected back button to remain present after selectRoute loading in ${fileName}`);

            // Now test error handling in selectRoute
            env.context.BusAPI.fetchCTB = () => Promise.reject(new Error('Fetch failed'));
            await env.context.selectRoute(routeObj);
            const backBtnOnError = env.sResults.querySelector('.back-btn');
            assert.ok(backBtnOnError, `Expected back button on selectRoute error in ${fileName}`);
            assert.ok(env.sResults.innerHTML.includes('failedDirections'), `Expected failedDirections text in ${fileName}`);
            const retryBtnOnError = env.sResults.querySelector('#retry-dir-btn');
            assert.ok(retryBtnOnError, `Expected retry button on selectRoute error in ${fileName}`);
        });

        await t.test(`${fileName}: header h1 has onclick="showHome()" and switchTab unhides favorites-section`, () => {
            const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
            assert.ok(html.includes('<h1 onclick="showHome()">'), `Expected header h1 to have onclick="showHome()" in ${fileName}`);
            const switchTabMatch = /function switchTab\s*\([^)]*\)\s*\{([\s\S]*?)\n        \}/.exec(html);
            assert.ok(switchTabMatch, `Expected switchTab function in ${fileName}`);
            assert.ok(
                switchTabMatch[1].includes("getElementById('favorites-section').classList.remove('hidden')"),
                `Expected switchTab to unhide favorites-section in ${fileName}`
            );
        });
    }
});
