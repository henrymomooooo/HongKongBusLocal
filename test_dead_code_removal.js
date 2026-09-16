const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');

test('Dead Code Removal Verification Test Suite', async (t) => {
    const htmlFiles = ['bus.html', 'bus_all.html'];

    for (const fileName of htmlFiles) {
        const html = fs.readFileSync(path.join(__dirname, fileName), 'utf8');

        // Item 1: Completely Unused Functions
        await t.test(`${fileName}: must not contain dead getRelativeTime function`, () => {
            const hasGetRelativeTime = /\bfunction\s+getRelativeTime\b/.test(html);
            assert.strictEqual(hasGetRelativeTime, false, `getRelativeTime should be removed from ${fileName}`);
        });

        await t.test(`${fileName}: must not contain dead copyServerCmd function`, () => {
            const hasCopyServerCmd = /\bfunction\s+copyServerCmd\b/.test(html);
            assert.strictEqual(hasCopyServerCmd, false, `copyServerCmd should be removed from ${fileName}`);
        });

        // Item 2: Orphaned DOM Lookups & Dummy Elements
        await t.test(`${fileName}: must not query non-existent local-server-warning element`, () => {
            const hasLocalServerWarning = /local-server-warning/.test(html);
            assert.strictEqual(hasLocalServerWarning, false, `local-server-warning check should be removed from ${fileName}`);
        });

        await t.test(`${fileName}: must not contain dummy gps-toggle checkbox element or queries`, () => {
            const hasGpsToggle = /\bid=["']gps-toggle["']/.test(html);
            assert.strictEqual(hasGpsToggle, false, `dummy gps-toggle element should be removed from ${fileName}`);
            
            const queriesGpsToggle = /getElementById\(['"]gps-toggle['"]\)/.test(html);
            assert.strictEqual(queriesGpsToggle, false, `getElementById('gps-toggle') should be removed from ${fileName}`);
        });

        // Item 3: Dead Variables & Constants
        await t.test(`${fileName}: must not contain unused UNIFIED_STOPS_DATA`, () => {
            const hasUnifiedStops = /\bUNIFIED_STOPS_DATA\b/.test(html);
            assert.strictEqual(hasUnifiedStops, false, `UNIFIED_STOPS_DATA should be removed from ${fileName}`);
        });

        // Item 4: Dead CSS Rules
        await t.test(`${fileName}: must not contain unused .switch / .slider toggle CSS rules`, () => {
            const hasSlider = /\.slider\b/.test(html);
            assert.strictEqual(hasSlider, false, `.slider CSS should be removed from ${fileName}`);

            const hasSwitchClass = /\.switch\s*\{/.test(html);
            assert.strictEqual(hasSwitchClass, false, `.switch CSS should be removed from ${fileName}`);
        });

        await t.test(`${fileName}: must not contain unused .add-group-area CSS rule`, () => {
            const hasAddGroupArea = /\.add-group-area\b/.test(html);
            assert.strictEqual(hasAddGroupArea, false, `.add-group-area CSS should be removed from ${fileName}`);
        });

        // Functional check: toggleHeaderGPS must work with gpsEnabled directly
        await t.test(`${fileName}: toggleHeaderGPS must toggle using gpsEnabled boolean`, () => {
            const headerGpsMatch = /function toggleHeaderGPS\s*\(\s*\)\s*\{([\s\S]*?)\}/.exec(html);
            assert.ok(headerGpsMatch, `toggleHeaderGPS function must exist in ${fileName}`);
            const body = headerGpsMatch[1];
            assert.strictEqual(body.includes('gps-toggle'), false, `toggleHeaderGPS must not reference gps-toggle in ${fileName}`);
            assert.ok(/toggleGPS\s*\(\s*!gpsEnabled\s*\)/.test(body), `toggleHeaderGPS should call toggleGPS(!gpsEnabled) in ${fileName}`);
        });
    }
});
