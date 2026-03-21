const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        
        await page.goto('http://localhost:5000/login.html');
        await page.type('#email', 'xxx@gmail.com');
        await page.type('#password', 'xxx');
        
        // Wait for role tabs
        await page.waitForSelector('.role-tab');
        const roleTabs = await page.$$('.role-tab');
        await roleTabs[1].click(); // Select Admin
        
        await page.click('button[type="submit"]');
        
        // Wait for dashboard to load and analytics API to resolve
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.waitForTimeout(1000); // 1 extra second for animations
        
        // Dump the HTML of the stats container
        const html = await page.$eval('#statsContainer', el => el.innerHTML);
        console.log("----- INNER HTML OF STATS CONTAINER -----");
        console.log(html);
        console.log("-----------------------------------------");
        
        // Dump computed styles of the stat cards to see if opacity is stuck
        const opacities = await page.$$eval('.stat-card', cards => cards.map(c => window.getComputedStyle(c).opacity));
        console.log("Stat card opacities:", opacities);
        
        await browser.close();
    } catch(err) {
        console.error(err);
    }
})();
