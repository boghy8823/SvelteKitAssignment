/**
 * Runs before each Lighthouse gather. Public URLs stay anonymous so the
 * marketing surface is what is scored. The dashboard URL signs in as the
 * editor — the same account the E2E suite uses — because that route is
 * behind the layout guard.
 *
 * Cookies are cleared first: LHCI may reuse the browser across URLs, and a
 * leftover session would turn `/en` into a signed-in page.
 *
 * @param {import('puppeteer-core').Browser} browser
 * @param {{ url: string }} context
 */
module.exports = async function authenticate(browser, { url }) {
	const page = await browser.newPage();
	const origin = new URL(url).origin;
	const client = await page.createCDPSession();

	await client.send('Network.clearBrowserCookies');

	if (!url.includes('/dashboard')) {
		await page.close();
		return;
	}

	await page.goto(`${origin}/en/login`, { waitUntil: 'domcontentloaded' });
	await page.type('input[name="email"]', 'editor@demo.test');
	await page.type('input[name="password"]', 'demo1234');
	await page.click('form button[type="submit"]');
	await page.waitForFunction(() => location.pathname.includes('/dashboard'), { timeout: 15_000 });
	await page.close();
};
