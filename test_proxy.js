const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

// 1. Extract BusAPI from bus.html
const htmlPath = path.join(__dirname, 'bus.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const startTag = 'const BusAPI = {';
const startIndex = html.indexOf(startTag);
if (startIndex === -1) {
    throw new Error('BusAPI definition not found in bus.html');
}

let braceCount = 1;
let index = startIndex + startTag.length;
while (braceCount > 0 && index < html.length) {
    if (html[index] === '{') braceCount++;
    else if (html[index] === '}') braceCount--;
    index++;
}
const busApiCode = html.substring(startIndex, index).replace(/const\s+BusAPI\s*=/, 'globalThis.BusAPI =');

// Helper to create test context with mocked dependencies
function createTestContext(protocol, fetchMock, warningsArray = []) {
    const context = {
        fetch: fetchMock,
        window: {
            location: {
                protocol: protocol
            }
        },
        DebugLogger: {
            log: () => {}
        },
        console: {
            warn: (msg) => warningsArray.push(msg),
            error: () => {},
            log: () => {}
        },
        URL: global.URL,
        encodeURIComponent: global.encodeURIComponent,
        Map: global.Map,
        Array: global.Array,
        Promise: global.Promise,
        setTimeout: global.setTimeout
    };
    vm.createContext(context);
    vm.runInContext(busApiCode, context);
    return context.BusAPI;
}

test('Proxy Test Suite - HK Bus App', async (t) => {

    await t.test('Scenario 1: Direct call fails, first proxy succeeds', async () => {
        const fetchCalls = [];
        const mockData = [{ route: '1A' }];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            if (url.startsWith('https://data.etabus.gov.hk')) {
                throw new TypeError('Failed to fetch');
            }
            return {
                ok: true,
                json: async () => ({ data: mockData })
            };
        };
        
        const BusAPI = createTestContext('file:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.deepStrictEqual(res, mockData);
        assert.strictEqual(fetchCalls.length, 2);
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.ok(fetchCalls[1].includes('api.codetabs.com'));
        assert.strictEqual(warnings.length, 1);
        assert.ok(warnings[0].includes('Direct API call failed'));
    });

    await t.test('Scenario 2: Direct call fails, first proxy fails (returns invalid data), second proxy succeeds', async () => {
        const fetchCalls = [];
        const mockData = [{ route: '2A' }];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            if (url.startsWith('https://data.etabus.gov.hk')) {
                throw new TypeError('Failed to fetch');
            }
            if (url.includes('api.codetabs.com')) {
                // Returns object instead of array (unexpected format)
                return {
                    ok: true,
                    json: async () => ({ error: 'Rate limit' })
                };
            }
            return {
                ok: true,
                json: async () => ({ data: mockData })
            };
        };
        
        const BusAPI = createTestContext('file:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.deepStrictEqual(res, mockData);
        assert.strictEqual(fetchCalls.length, 3);
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.ok(fetchCalls[1].includes('api.codetabs.com'));
        assert.ok(fetchCalls[2].includes('corsproxy.io'));
        assert.strictEqual(warnings.length, 2);
        assert.ok(warnings[0].includes('Direct API call failed'));
        assert.ok(warnings[1].includes('Proxy #1 failed'));
    });

    await t.test('Scenario 3: Direct call fails, first and second proxies fail, third proxy succeeds', async () => {
        const fetchCalls = [];
        const mockData = [{ route: '3M' }];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            if (url.startsWith('https://data.etabus.gov.hk')) {
                throw new TypeError('Failed to fetch');
            }
            if (url.includes('api.codetabs.com') || url.includes('corsproxy.io')) {
                // Fails network call
                return {
                    ok: false,
                    status: 500
                };
            }
            return {
                ok: true,
                json: async () => ({ data: mockData })
            };
        };
        
        const BusAPI = createTestContext('file:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.deepStrictEqual(res, mockData);
        assert.strictEqual(fetchCalls.length, 4);
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.ok(fetchCalls[1].includes('api.codetabs.com'));
        assert.ok(fetchCalls[2].includes('corsproxy.io'));
        assert.ok(fetchCalls[3].includes('allorigins.win'));
        assert.strictEqual(warnings.length, 3);
        assert.ok(warnings[0].includes('Direct API call failed'));
        assert.ok(warnings[1].includes('Proxy #1 failed'));
        assert.ok(warnings[2].includes('Proxy #2 failed'));
    });

    await t.test('Scenario 4: Direct call fails, and all proxies also fail (returns null)', async () => {
        const fetchCalls = [];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            throw new Error('Connection refused');
        };
        
        const BusAPI = createTestContext('file:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.strictEqual(res, null);
        assert.strictEqual(fetchCalls.length, 4); // 1 direct + 3 proxies
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.ok(fetchCalls[1].includes('api.codetabs.com'));
        assert.ok(fetchCalls[2].includes('corsproxy.io'));
        assert.ok(fetchCalls[3].includes('allorigins.win'));
        
        assert.strictEqual(warnings.length, 5); // 1 direct warning + 3 proxy warnings + 1 final fail warning
        assert.ok(warnings[0].includes('Direct API call failed'));
        assert.ok(warnings[1].includes('Proxy #1 failed'));
        assert.ok(warnings[2].includes('Proxy #2 failed'));
        assert.ok(warnings[3].includes('Proxy #3 failed'));
        assert.ok(warnings[4].includes('All proxies and direct API call failed'));
    });

    await t.test('Scenario 5: Direct call succeeds immediately, no proxies are called', async () => {
        const fetchCalls = [];
        const mockData = [{ route: '962X' }];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            return {
                ok: true,
                json: async () => ({ data: mockData })
            };
        };
        
        const BusAPI = createTestContext('file:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.deepStrictEqual(res, mockData);
        assert.strictEqual(fetchCalls.length, 1);
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.strictEqual(warnings.length, 0);
    });

    await t.test('Scenario 6: Running under web protocol (http:) succeeds on direct call first', async () => {
        const fetchCalls = [];
        const mockData = [{ route: '5C' }];
        const warnings = [];
        
        const fetchMock = async (url) => {
            fetchCalls.push(url);
            return {
                ok: true,
                json: async () => ({ data: mockData })
            };
        };
        
        const BusAPI = createTestContext('http:', fetchMock, warnings);
        const res = await BusAPI.fetchKMB('/route/');
        
        assert.deepStrictEqual(res, mockData);
        assert.strictEqual(fetchCalls.length, 1);
        assert.ok(fetchCalls[0].includes('data.etabus.gov.hk'));
        assert.strictEqual(warnings.length, 0);
    });
});
