// Run with PLAYWRIGHT_MODULE pointing to an installed playwright-core package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  // Only this test response disables Firebase; production data is never touched.
  const localHtml = html.replace(/const firebaseConfig = \{[\s\S]*?\};/, 'const firebaseConfig = {apiKey: "여기에"};');
  assert.notEqual(localHtml, html);
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true
  });
  try {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => route.fulfill({
      contentType: 'text/html; charset=utf-8', body: route.request().isNavigationRequest() ? localHtml : ''
    }));
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:4173/');
    await page.locator('#draftNotice').waitFor({ state: 'attached' });
    await page.locator('#fab').click();
    await page.locator('#fName').fill('민지');
    await page.locator('#fMsg').fill('생일 축하해!\n행복한 하루');
    await page.locator('input[name="color"][value="mint"]').check();
    await page.locator('#fPw').fill('1234');
    const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('rollingpaper-draft-v1')));
    assert.deepEqual(draft, { name: '민지', message: '생일 축하해!\n행복한 하루', color: 'mint' });
    await page.reload();
    await page.locator('#fab').click();
    assert.equal(await page.locator('#fName').inputValue(), '민지');
    assert.equal(await page.locator('#fMsg').inputValue(), draft.message);
    assert.equal(await page.locator('#fPw').inputValue(), '');
    assert.equal(await page.locator('input[name="color"][value="mint"]').isChecked(), true);
    assert.equal(await page.locator('#msgLen').innerText(), String(draft.message.length));
    await page.getByText('작성 중이던 글을 복구했어요. 삭제용 비밀번호는 다시 입력해 주세요.').waitFor();
    await page.locator('#submitBtn').click();
    await page.getByText('삭제용 비밀번호는 숫자 4자리예요', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('rollingpaper-draft-v1') !== null), true);
    await page.locator('#fPw').fill('1234');
    await page.locator('#submitBtn').click();
    await page.locator('#writeDlg').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => sessionStorage.getItem('rollingpaper-draft-v1')), null);
    assert.equal(await page.locator('#count').innerText(), '1');
    await page.reload();
    await page.locator('#fab').click();
    assert.equal(await page.locator('#fMsg').inputValue(), '');
    await page.locator('#writeDlg [data-close]').click();
    await page.locator('#board .note').click();
    assert.equal(await page.locator('#viewMsg').innerText(), draft.message);
    await page.locator('#delToggle').click();
    await page.locator('#delPw').fill('0000');
    await page.locator('#delForm button[type="submit"]').click();
    await page.getByText('비밀번호가 달라요 🥲', { exact: true }).waitFor();
    await page.locator('#delPw').fill('1234');
    await page.locator('#delForm button[type="submit"]').click();
    await page.locator('#viewDlg').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#count').innerText(), '0');
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('#fab').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator('#writeDlg [data-close]').click();
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('#fab').click();
    await page.screenshot({ path: path.join(process.env.TEMP, 'rollingpaper-draft-mobile.png'), fullPage: true });
    for (const mode of ['corrupt', 'blocked']) {
      const failurePage = await context.newPage();
      failurePage.setDefaultTimeout(10000);
      failurePage.on('pageerror', error => errors.push(error.message));
      await failurePage.addInitScript(mode => {
        if (mode === 'corrupt') sessionStorage.setItem('rollingpaper-draft-v1', '{invalid');
        else Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
      }, mode);
      await failurePage.goto('http://localhost:4173/');
      await failurePage.locator('#fab').click();
      await failurePage.locator('#fName').fill('수아');
      await failurePage.locator('#fMsg').fill('저장이 제한되어도 작성 가능');
      if (mode === 'blocked') await failurePage.getByText('이 브라우저에서는 임시 저장이 안 돼요. 새로고침 전에 글을 복사해 주세요.').waitFor();
      await failurePage.locator('#fPw').fill('1234');
      await failurePage.locator('#submitBtn').click();
      await failurePage.locator('#writeDlg').waitFor({ state: 'hidden' });
      await failurePage.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: draft restore/name/message/color/count, password excluded, validation retains draft, success clears draft, create/detail/password/delete, 4 widths, corrupt/blocked storage, pageerror 0');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
