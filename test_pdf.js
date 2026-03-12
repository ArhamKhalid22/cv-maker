const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/app.html');
  await page.type('#resume-name', 'John Doe');
  await page.type('#resume-title', 'Engineer');
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.click('#generate-pdf-btn');
  await page.waitForTimeout(2000); // 2 s
  
  await browser.close();
})();
