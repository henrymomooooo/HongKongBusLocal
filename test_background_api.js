const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');

function extractFunctionBody(code, functionSignature) {
    const idx = code.indexOf(functionSignature);
    if (idx === -1) return null;
    const openBraceIdx = code.indexOf('{', idx);
    if (openBraceIdx === -1) return null;
    let depth = 1;
    let i = openBraceIdx + 1;
    while (i < code.length && depth > 0) {
        if (code[i] === '{') depth++;
        else if (code[i] === '}') depth--;
        i++;
    }
    return code.substring(openBraceIdx + 1, i - 1);
}

test('Background API Call Optimization Test Suite', async (t) => {
    const htmlFiles = ['bus.html', 'bus_all.html'];

    for (const fileName of htmlFiles) {
        const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');

        await t.test(`${fileName}: syncRoutes must not automatically call syncStops on startup`, () => {
            const syncRoutesBody = extractFunctionBody(html, 'async function syncRoutes(');
            assert.ok(syncRoutesBody, `syncRoutes function should exist in ${fileName}`);

            const callsSyncStops = /syncStops\s*\(/.test(syncRoutesBody);
            assert.strictEqual(
                callsSyncStops,
                false,
                `syncRoutes in ${fileName} must NOT trigger syncStops on startup`
            );
        });

        await t.test(`${fileName}: syncStops must not launch unthrottled background indexing on cached stops`, () => {
            const syncStopsBody = extractFunctionBody(html, 'async function syncStops(');
            assert.ok(syncStopsBody, `syncStops function should exist in ${fileName}`);

            // Check cached return block
            const cachedBlockMatch = /if\s*\(!force\s*&&[\s\S]*?THIRTY_DAYS[\s\S]*?\{([\s\S]*?)\}/.exec(syncStopsBody);
            assert.ok(cachedBlockMatch, 'syncStops should have cached check');
            const cachedBlock = cachedBlockMatch[1];

            const launchesCrawler = /indexCTBRouteStopsInBackground|indexKMBRouteStopsInBackground/.test(cachedBlock);
            assert.strictEqual(
                launchesCrawler,
                false,
                `syncStops in ${fileName} must not launch background crawler when stops are already cached`
            );
        });

        await t.test(`${fileName}: syncStops should use bulk /route-stop for KMB instead of crawling individual routes`, () => {
            const syncStopsBody = extractFunctionBody(html, 'async function syncStops(');
            assert.ok(syncStopsBody, `syncStops function should exist in ${fileName}`);

            // Should fetch /route-stop in bulk for KMB
            const usesBulkRouteStop = /fetchKMB\s*\(\s*['"]\/route-stop['"]/.test(syncStopsBody);
            assert.strictEqual(
                usesBulkRouteStop,
                true,
                `syncStops in ${fileName} should fetch bulk '/route-stop' for KMB`
            );
        });

        await t.test(`${fileName}: must not have unthrottled 0ms setInterval for route crawling`, () => {
            // Check for setInterval(async () => { ... }) without second argument in route indexing
            const unthrottledInterval = /setInterval\s*\(\s*async\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)/.test(html);
            assert.strictEqual(
                unthrottledInterval,
                false,
                `${fileName} must not contain unthrottled setInterval without a timeout delay`
            );
        });
    }
});
