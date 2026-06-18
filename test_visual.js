const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('Starting visual test screenshot generator...');
    const browser = await chromium.launch({ headless: true });
    
    // Set a phone-like viewport but tall enough to see the map, stops list, and open CCTV drawer
    const context = await browser.newContext({
        viewport: { width: 450, height: 1050 },
        permissions: ['geolocation'],
        geolocation: { latitude: 22.3000, longitude: 114.1700 }
    });
    
    const page = await context.newPage();
    
    // 1. Mock KMB Route List API
    await page.route('https://data.etabus.gov.hk/v1/transport/kmb/route', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'Route List',
                version: '1.0',
                data: [
                    {
                        co: 'KMB',
                        route: '1A',
                        bound: 'O',
                        service_type: '1',
                        orig_tc: '中秀茂坪',
                        orig_en: 'Sau Mau Ping (Central)',
                        dest_tc: '尖沙咀碼頭',
                        dest_en: 'Tsim Sha Tsui Ferry Pier'
                    }
                ]
            })
        });
    });

    // 2. Mock KMB Stops Registry API
    await page.route('https://data.etabus.gov.hk/v1/transport/kmb/stop', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'Stop List',
                version: '1.0',
                data: [
                    { stop: 'TST-1', name_tc: '尖沙咀碼頭', name_en: 'Tsim Sha Tsui Ferry Pier', lat: '22.2938', long: '114.1687' },
                    { stop: 'TST-2', name_tc: '尖沙咀東 (麼地道)', name_en: 'Tsim Sha Tsui East (Mody Road)', lat: '22.2988', long: '114.1722' },
                    { stop: 'HH-1', name_tc: '紅磡站', name_en: 'Hung Hom Station', lat: '22.3022', long: '114.1741' }
                ]
            })
        });
    });

    // 3. Mock KMB Route-Stop Sequence API
    await page.route('https://data.etabus.gov.hk/v1/transport/kmb/route-stop/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'Route Stop List',
                version: '1.0',
                data: [
                    { co: 'KMB', route: '1A', bound: 'O', service_type: '1', seq: '1', stop: 'TST-1' },
                    { co: 'KMB', route: '1A', bound: 'O', service_type: '1', seq: '2', stop: 'TST-2' },
                    { co: 'KMB', route: '1A', bound: 'O', service_type: '1', seq: '3', stop: 'HH-1' }
                ]
            })
        });
    });

    // 4. Mock Citybus Route List & Stops Registry APIs
    await page.route('https://rt.data.gov.hk/v2/transport/citybus/route/CTB', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });
    await page.route('https://rt.data.gov.hk/v2/transport/citybus/stop/CTB', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    // 5. Mock NLB Route List API
    await page.route('https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ routes: [] }) });
    });

    // 6. Mock OSRM Driving Path API
    await page.route('https://router.project-osrm.org/route/v1/driving/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                code: 'Ok',
                routes: [
                    {
                        geometry: {
                            coordinates: [
                                [114.1687, 22.2938],
                                [114.1722, 22.2988],
                                [114.1741, 22.3022]
                            ],
                            type: 'LineString'
                        }
                    }
                ]
            })
        });
    });

    // 7. Mock CCTV Camera Registry API
    await page.route('https://tdcctv.data.gov.hk/key-cctv-locations.json', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    key: 'BC_TEST',
                    name: 'Salisbury Road near TST East',
                    latitude: 22.3005,
                    longitude: 114.17315
                }
            ])
        });
    });

    // 8. Mock KMB Stop ETAs API
    await page.route('https://data.etabus.gov.hk/v1/transport/kmb/eta/**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'ETA List',
                version: '1.0',
                data: [
                    {
                        co: 'KMB',
                        route: '1A',
                        dir: 'O',
                        service_type: 1,
                        seq: 1,
                        dest_tc: '尖沙咀碼頭',
                        dest_en: 'Tsim Sha Tsui Ferry Pier',
                        eta_seq: 1,
                        eta: new Date(Date.now() + 300000).toISOString(),
                        rmk_tc: '預定班次',
                        rmk_en: 'Scheduled'
                    }
                ]
            })
        });
    });

    // Load the new bus_all.html file
    const fileUrl = 'file://' + path.resolve(__dirname, 'bus_all.html');
    console.log(`Navigating to ${fileUrl}...`);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    
    // Enable GPS emulated tracking
    await page.evaluate(() => {
        localStorage.setItem('app_gps_enabled', 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for the initialization overlay to disappear
    await page.waitForSelector('#initial-loading', { state: 'hidden', timeout: 15000 });

    // Search for 1A
    await page.fill('#route-input', '1A');
    await page.waitForSelector('.card.co-KMB');
    
    // Click KMB 1A card
    await page.locator('.card.co-KMB').first().click();
    await page.waitForSelector('#stop-selection-results');

    // Wait for Leaflet map container to render
    await page.waitForSelector('#route-stops-map');
    
    // Wait for CCTV marker and pairing to finish
    await page.waitForSelector('#cctv-holder-1 .camera-btn', { timeout: 15000 });
    
    // Click camera button to slide open the CCTV drawer
    console.log('Opening CCTV Drawer...');
    await page.click('#cctv-holder-1 .camera-btn');
    
    // Wait for the drawer transition to finish (e.g. 500ms)
    await page.waitForTimeout(1000);

    // Save screenshot to artifacts folder
    const artifactDir = '/home/henry/.gemini/antigravity-cli/brain/c6ed4303-b9a4-44fd-8e3d-cc399f720edd';
    if (!fs.existsSync(artifactDir)) {
        fs.mkdirSync(artifactDir, { recursive: true });
    }
    const screenshotPath = path.join(artifactDir, 'visual_test_map.png');
    console.log(`Capturing screenshot to ${screenshotPath}...`);
    await page.screenshot({ path: screenshotPath });
    
    console.log('Screenshot captured successfully.');
    await browser.close();
    process.exit(0);
})().catch(err => {
    console.error('Visual test failed:', err);
    process.exit(1);
});
