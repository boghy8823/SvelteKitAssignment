const { createHmac } = require('node:crypto');

/**
 * Same token the app issues in `src/lib/server/auth/hmac.ts`: HMAC-SHA256 of
 * the base64url payload, keyed with AUTH_SECRET. Kept here so Lighthouse can
 * plant a session without walking the login form — that page's first <form>
 * is the theme toggle, and submitting it just returns to /login.
 */
function encodeBase64Url(bytes) {
	return Buffer.from(bytes)
		.toString('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
}

function signSession(secret, account) {
	const session = JSON.stringify({
		sub: account.id,
		role: account.role,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
	});
	const encoded = encodeBase64Url(Buffer.from(session, 'utf8'));
	const signature = createHmac('sha256', secret).update(encoded, 'utf8').digest();

	return `${encoded}.${encodeBase64Url(signature)}`;
}

/**
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

	const secret = process.env.AUTH_SECRET ?? 'lhci-preview-secret';
	const token = signSession(secret, { id: 'demo_editor', role: 'editor' });

	// Cookie jar is origin-scoped; visiting first lets setCookie stick.
	await page.goto(`${origin}/en`, { waitUntil: 'domcontentloaded' });
	await page.setCookie({
		name: 'session',
		value: token,
		url: origin,
		path: '/',
		httpOnly: true,
		sameSite: 'Lax',
		secure: false
	});

	await page.goto(`${origin}/en/dashboard/items`, {
		waitUntil: 'domcontentloaded',
		timeout: 30_000
	});

	if (page.url().includes('/login')) {
		throw new Error(`Session cookie was rejected (landed on ${page.url()})`);
	}

	await page.close();
};
