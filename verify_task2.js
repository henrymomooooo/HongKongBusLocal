const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const checks = [
    {
        name: 'swapDirection stub exists',
        test: /function swapDirection\(r\)\s*{\s*console\.log\('Swapping direction for',\s*r\);\s*}/.test(indexContent)
    },
    {
        name: 'Swap button icon in showStops header',
        test: /id="swap-dir-btn"/.test(indexContent) && /fas fa-right-left/.test(indexContent)
    },
    {
        name: 'Swap button onclick handler',
        test: /swapBtn\.onclick = \(\) => swapDirection\(r\)/.test(indexContent)
    }
];

let allPassed = true;
checks.forEach(check => {
    if (check.test) {
        console.log(`✅ PASS: ${check.name}`);
    } else {
        console.log(`❌ FAIL: ${check.name}`);
        allPassed = false;
    }
});

if (!allPassed) {
    process.exit(1);
} else {
    console.log('\nAll Task 2 verification checks passed!');
}
