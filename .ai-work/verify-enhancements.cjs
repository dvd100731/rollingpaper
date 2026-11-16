// Run with PLAYWRIGHT_MODULE pointing to an installed playwright-core package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  // The test-only response selects local storage, never the live Firestore database.
  const localHtml = html.replace(/const firebaseConfig = \{[\s\S]*?\};/, 'const firebaseConfig = {apiKey: "여기에"};');
  assert.notEqual(localHtml, html);
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (route.request().url() === 'http://localhost:4173/') {
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: localHtml });
      }
      return route.fulfill({ status: 200, body: '' });
    });
    await page.goto('http://localhost:4173/');
    await page.getByText('미리보기 모드 · 이 기기에만 저장돼요 (Firebase 설정 전)').waitFor();
    const visible = () => page.locator('#board .note:visible').count();
    async function add(name, message, color) {
      await page.locator('#fab').click();
      await page.locator('#fName').fill(name);
      await page.locator('#fMsg').fill(message);
      await page.locator(`input[name="color"][value="${color}"]`).check();
      await page.locator('#fPw').fill('1234');
      await page.locator('#submitBtn').click();
      await page.locator('#writeDlg').waitFor({ state: 'hidden' });
    }
    await add('민지', '생일 축하해! Happy birthday', 'pink');
    await add('준호', '행복한 하루 보내', 'mint');
    await add('수아', '축하해! 좋은 하루', 'yellow');
    assert.equal(await visible(), 3);
    await page.locator('#paperSearch').fill('  HAPPY  ');
    assert.equal(await visible(), 1);
    await page.locator('#paperSearch').fill('민지');
    assert.equal(await visible(), 1);
    await page.locator('#paperColor').selectOption('mint');
    assert.equal(await visible(), 0);
    assert.match(await page.locator('.paper-results').innerText(), /조건에 맞는 메시지가 없어요/);
    await page.locator('#paperReset').click();
    assert.equal(await visible(), 3);
    assert.equal(await page.locator('#paperSearch').evaluate(el => el === document.activeElement), true);
    await page.locator('#paperColor').selectOption('pink');
    await add('윤수', '고마워!', 'pink');
    assert.equal(await visible(), 2);
    assert.equal(await page.locator('#count').innerText(), '4');
    await page.locator('#board .note:visible').first().click();
    await page.locator('#delToggle').click();
    await page.locator('#delPw').fill('0000');
    await page.locator('#delForm button[type="submit"]').click();
    await page.getByText('비밀번호가 달라요 🥲', { exact: true }).waitFor();
    await page.locator('#delPw').fill('1234');
    await page.locator('#delForm button[type="submit"]').click();
    await page.locator('#viewDlg').waitFor({ state: 'hidden' });
    assert.equal(await visible(), 1);
    await page.locator('#paperReset').click();
    await page.reload();
    await page.locator('#board .note').first().waitFor();
    assert.equal(await visible(), 3);
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: path.join(process.env.TEMP, 'rollingpaper-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: path.join(process.env.TEMP, 'rollingpaper-desktop.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: search, combined color filter, reset/focus, live render preservation, create/detail/password/delete/reload, 4 viewport widths, no page errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
