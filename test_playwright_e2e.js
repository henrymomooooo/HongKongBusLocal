const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('Starting Playwright Browser Test for HK Bus Arrivals...');
    const browser = await chromium.launch({ headless: true });
    
    // Create context with emulated geolocation (near Salisbury Road, TST)
    const context = await browser.newContext({
        viewport: { width: 400, height: 800 },
        permissions: ['geolocation'],
        geolocation: { latitude: 22.3000, longitude: 114.1700 }
    });
    
    const page = await context.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
            console.log(`BROWSER ERROR: ${text}`);
        } else {
            console.log(`BROWSER LOG: ${text}`);
        }
    });

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

    // 4. Mock Citybus Route List API
    await page.route('https://rt.data.gov.hk/v2/transport/citybus/route/CTB', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'Route List',
                version: '2.0',
                data: []
            })
        });
    });

    // 5. Mock Citybus Stops Registry API
    await page.route('https://rt.data.gov.hk/v2/transport/citybus/stop/CTB', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                type: 'Stop List',
                version: '2.0',
                data: []
            })
        });
    });

    // 6. Mock NLB Route List API
    await page.route('https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                routes: []
            })
        });
    });

    // 7. Mock OSRM Driving Path API
    await page.route('https://router.project-osrm.org/route/v1/driving/**', async (route) => {
        console.log(`Mocking OSRM call: ${route.request().url()}`);
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

    // 8. Mock CCTV Camera Registry API
    await page.route('https://tdcctv.data.gov.hk/key-cctv-locations.json', async (route) => {
        console.log(`Mocking CCTV locations call: ${route.request().url()}`);
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

    // 9. Mock KMB Stop ETAs API
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

    // Navigate to the local bus_all.html file
    const fileUrl = 'file://' + path.resolve(__dirname, 'bus_all.html');
    console.log(`Navigating to page: ${fileUrl}`);
    await page.goto(fileUrl);
    
    // Enable GPS emulated tracking by toggling in storage/pill
    await page.evaluate(() => {
        localStorage.setItem('app_gps_enabled', 'true');
    });
    
    // Reload page to apply storage GPS config
    await page.reload();

    // Verify page title
    const title = await page.title();
    console.log(`Page title: "${title}"`);
    assert.strictEqual(title, 'HK Bus Arrivals');
    
    // Wait for the initialization overlay to disappear
    console.log('Waiting for initial loading to complete...');
    await page.waitForSelector('#initial-loading', { state: 'hidden', timeout: 15000 });
    console.log('Initial loading overlay is hidden!');

    // Type "1A" in the search box
    console.log('Searching for route "1A"...');
    await page.fill('#route-input', '1A');
    
    // Wait for the route results card to appear
    await page.waitForSelector('.card.co-KMB');
    const routeCard = await page.locator('.card.co-KMB').first();
    const routeText = await routeCard.innerText();
    console.log(`Found route card: "${routeText.replace(/\n/g, ' ')}"`);
    assert.ok(routeText.includes('1A'));

    // Click on the KMB 1A route card to load its stops timeline view
    console.log('Clicking on route card...');
    await routeCard.click();

    // Wait for the Stops Timeline to load
    console.log('Waiting for timeline view to render...');
    await page.waitForSelector('#stop-selection-results');

    // Verify Leaflet Map container is rendered
    console.log('Verifying Leaflet map is rendered in timeline...');
    await page.waitForSelector('#route-stops-map');
    const mapContainerClass = await page.getAttribute('#route-stops-map', 'class');
    assert.ok(mapContainerClass.includes('leaflet-container'), 'Map should be initialized by Leaflet');
    console.log('Leaflet Map initialized successfully!');

    // Verify stop cards are loaded
    const stopCards = await page.locator('.station-card');
    const stopCount = await stopCards.count();
    console.log(`Found ${stopCount} stops in timeline`);
    assert.strictEqual(stopCount, 3);

    // Verify stop connectors are loaded
    const connectors = await page.locator('.timeline-connector-block');
    const connectorCount = await connectors.count();
    console.log(`Found ${connectorCount} segment connectors`);
    assert.strictEqual(connectorCount, 2);

    // Wait for OSRM path matching and CCTV location resolution
    console.log('Waiting for OSRM path & CCTV mapping to complete...');
    // Salisbury Road CCTV is near Salisbury Road/TST East (between Stop 2 and Stop 3, i.e. intervalIdx = 1)
    await page.waitForSelector('#cctv-holder-1 .camera-btn', { timeout: 15000 });
    console.log('CCTV Camera paired to segment successfully!');

    // Verify camera button label
    const cameraBtnText = await page.locator('#cctv-holder-1 .camera-btn').innerText();
    console.log(`Camera button text: "${cameraBtnText}"`);
    assert.ok(cameraBtnText.includes('Salisbury Road near TST East'));

    // Verify CCTV drawer starts closed
    const drawer = await page.locator('#timeline-cctv-drawer-1-BC_TEST');
    const isDrawerOpen = await drawer.evaluate(el => el.classList.contains('open'));
    assert.strictEqual(isDrawerOpen, false, 'CCTV drawer should start closed');

    // Click CCTV button to slide drawer open
    console.log('Clicking CCTV button...');
    await page.click('#cctv-holder-1 .camera-btn');
    
    // Wait for open class to be applied
    await page.waitForFunction(() => {
        return document.getElementById('timeline-cctv-drawer-1-BC_TEST').classList.contains('open');
    }, { timeout: 5000 });
    console.log('CCTV Drawer successfully opened!');

    // Verify image source was set
    const imgSrc = await page.getAttribute('#cctv-img-1-BC_TEST', 'src');
    console.log(`CCTV image source: "${imgSrc}"`);
    assert.ok(imgSrc.startsWith('https://tdcctv.data.gov.hk/BC_TEST.JPG'));

    // 10. Verify Visual Progress Bar presence
    console.log('Verifying visual refresh progress bar renders...');
    const progressBar = page.locator('#refresh-progress-bar');
    await progressBar.waitFor({ state: 'attached' });
    
    // Let it tick slightly and check width transitions from 0%
    await page.waitForTimeout(2000);
    const widthText = await progressBar.evaluate(el => el.style.width);
    console.log(`Progress bar width style after 2s: "${widthText}"`);
    assert.ok(widthText !== '0%', 'Progress bar should have ticked forward');

    // Click manual refresh button and check progress bar resets to 0%
    console.log('Clicking manual refresh to verify progress bar resets...');
    // Return to home view so the refresh button is visible and clickable
    await page.click('.back-btn');
    await page.click('#refresh-btn');
    await page.waitForTimeout(100);
    const widthAfterReset = await progressBar.evaluate(el => el.style.width);
    console.log(`Progress bar width style immediately after manual refresh: "${widthAfterReset}"`);
    assert.strictEqual(widthAfterReset, '0%', 'Progress bar should reset to 0%');

    console.log('All Playwright UI tests completed successfully!');
    await browser.close();
    process.exit(0);
})().catch(err => {
    console.error('Playwright UI Test Failed:', err);
    process.exit(1);
});
