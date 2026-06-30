const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert');

// 1. Read bus_all.html and extract the JavaScript functions
const htmlPath = path.join(__dirname, 'bus_all.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
if (scriptStart === -1 || scriptEnd === -1) {
    throw new Error('Script block not found in bus_all.html');
}

const scriptCode = html.substring(scriptStart + 8, scriptEnd);

function extractFunction(name) {
    const startStr = `function ${name}(`;
    const startIdx = scriptCode.indexOf(startStr);
    if (startIdx === -1) {
        throw new Error(`Function ${name} not found in script`);
    }
    
    let braceCount = 0;
    let idx = startIdx;
    while (idx < scriptCode.length) {
        if (scriptCode[idx] === '{') braceCount++;
        else if (scriptCode[idx] === '}') {
            braceCount--;
            if (braceCount === 0) {
                idx++;
                break;
            }
        }
        idx++;
    }
    return scriptCode.substring(startIdx, idx);
}

// Extract the required mathematical functions
const getDistanceCode = extractFunction('getDistance');
const getDistanceToSegmentCode = extractFunction('getDistanceToSegment');
const getSegmentTrafficColorCode = extractFunction('getSegmentTrafficColor');

const getRelativeCountdownTimeCode = extractFunction('getRelativeCountdownTime');

// Create a VM context to run the code
const context = {
    console: console,
    Math: Math,
    Date: Date
};
vm.createContext(context);
vm.runInContext(getDistanceCode, context);
vm.runInContext(getDistanceToSegmentCode, context);
vm.runInContext(getSegmentTrafficColorCode, context);
vm.runInContext(getRelativeCountdownTimeCode, context);

const { getDistance, getDistanceToSegment, getSegmentTrafficColor, getRelativeCountdownTime } = context;

test('HK Bus Traffic & Map Math Tests', async (t) => {

    await t.test('getRelativeCountdownTime: formats remaining time correctly', () => {
        const now = new Date('2026-06-30T04:00:00Z');
        
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

    await t.test('getDistance: accurately calculates distance between two points', () => {
        // Hong Kong Observatory to Tsim Sha Tsui MTR Station
        const lat1 = 22.3022, lon1 = 114.1741;
        const lat2 = 22.2988, lon2 = 114.1722;
        
        const dist = getDistance(lat1, lon1, lat2, lon2);
        
        // Expected distance is ~425 meters. Let's check it's within tolerance (400m to 450m)
        assert.ok(dist > 400 && dist < 450, `Calculated distance: ${dist}m`);
    });

    await t.test('getDistanceToSegment: close point matches segment', () => {
        // Line segment from [22.30, 114.15] to [22.31, 114.15] (straight vertical line)
        const a = [22.30, 114.15];
        const b = [22.31, 114.15];
        
        // Point is right in the middle vertically [22.305] and shifted slightly horizontally
        // 114.1501 is about 10.3 meters shift in Hong Kong latitude
        const pClose = [22.305, 114.1501];
        
        const dist = getDistanceToSegment(pClose, a, b);
        
        // Assert distance is close to 10 meters (between 9m and 12m)
        assert.ok(dist > 9 && dist < 12, `Calculated projection distance: ${dist}m`);
    });

    await t.test('getDistanceToSegment: far point does not match segment', () => {
        const a = [22.30, 114.15];
        const b = [22.31, 114.15];
        
        // Point shifted far horizontally (approx 1 km away)
        const pFar = [22.305, 114.16];
        
        const dist = getDistanceToSegment(pFar, a, b);
        
        // Assert distance is roughly 1 km (between 900m and 1100m)
        assert.ok(dist > 900 && dist < 1100, `Calculated projection distance: ${dist}m`);
    });

    await t.test('getSegmentTrafficColor: returns a valid simulated speed color', () => {
        const lat1 = 22.30, lon1 = 114.15;
        const lat2 = 22.31, lon2 = 114.15;
        
        const color = getSegmentTrafficColor(lat1, lon1, lat2, lon2);
        
        // Assert color is one of the three traffic color levels
        assert.ok(['#d32f2f', '#f57c00', '#2e7d32'].includes(color), `Color returned: ${color}`);
        
        // Assert stability: calling it twice with identical coordinates returns identical color
        const color2 = getSegmentTrafficColor(lat1, lon1, lat2, lon2);
        assert.strictEqual(color, color2);
    });
});
