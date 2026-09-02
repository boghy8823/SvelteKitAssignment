/**
 * Runs before each Lighthouse gather. Public URLs stay anonymous so the
 * marketing surface is what is scored. The dashboard URL signs in as the
 * editor — the same account the E2E suite uses — because that route is
 * behind the layout guard.
 *
 * Cookies are cleared first: LHCI may reuse the browser across URLs, and a
 * leftover session would turn `/en` into a signed-in page.
 *
 * The form is submitted natively (`HTMLFormElement.submit`) so SvelteKit's
 * `use:enhance` cannot turn the POST into a client-side navigation that
 * `waitForFunction` never sees.
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
	await page.waitForSelector('form input[name="email"]');
	await page.type('input[name="email"]', 'editor@demo.test');
	await page.type('input[name="password"]', 'demo1234');

	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 }),
		page.$eval('form', (form) => {
			if (!(form instanceof HTMLFormElement)) {
				throw new Error('Login form missing');
			}

			form.submit();
		})
	]);

	if (!page.url().includes('/dashboard')) {
		throw new Error(`Login did not reach the dashboard (landed on ${page.url()})`);
	}

	await page.close();
};
