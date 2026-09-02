const port = Number(process.env.PORT ?? 3000);
const origin = `http://localhost:${port}`;
const authSecret = process.env.AUTH_SECRET ?? 'lhci-preview-secret';

const categories = {
	'categories:performance': ['error', { minScore: 0.95 }],
	'categories:accessibility': ['error', { minScore: 0.95 }],
	'categories:best-practices': ['error', { minScore: 0.95 }]
};

/**
 * Lab budgets from the brief, on Lighthouse's default mobile profile
 * (Moto G Power, simulated Slow 4G). INP is the lab estimate — there is no
 * real user interaction in a gather — but the budget is still enforced so a
 * regression cannot hide behind "we only measure LCP".
 */
const webVitals = {
	'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
	'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
	'interaction-to-next-paint': ['error', { maxNumericValue: 200 }]
};

/**
 * The Node preview is what CI and Lighthouse share: a production build that
 * needs no Vercel credentials. The real deploy's edge/ISR split is a different
 * surface and is not what this gate can see.
 */
module.exports = {
	ci: {
		collect: {
			numberOfRuns: 3,
			url: [
				`${origin}/en`,
				`${origin}/en/blog/sub-second-lcp-on-a-content-site`,
				`${origin}/en/dashboard/items`
			],
			startServerCommand: `cross-env AUTH_SECRET=${authSecret} ORIGIN=${origin} PORT=${port} node build`,
			startServerReadyPattern: 'Listening',
			startServerReadyTimeout: 60_000,
			puppeteerScript: './tools/lhci-auth.cjs',
			puppeteerLaunchOptions: {
				pipe: true,
				args: ['--no-sandbox', '--disable-dev-shm-usage', '--headless=new']
			},
			settings: {
				// Default Lighthouse mobile is Moto G Power + Slow 4G. Saying so
				// here keeps a future preset change from silently switching the gate.
				formFactor: 'mobile',
				throttlingMethod: 'simulate',
				screenEmulation: {
					mobile: true,
					width: 412,
					height: 823,
					deviceScaleFactor: 1.75,
					disabled: false
				},
				throttling: {
					rttMs: 150,
					throughputKbps: 1_638.4,
					cpuSlowdownMultiplier: 4
				},
				onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
			}
		},
		assert: {
			assertMatrix: [
				{
					matchingUrlPattern: '.*',
					assertions: {
						...categories,
						...webVitals,
						'categories:seo': ['error', { minScore: 0.95 }]
					}
				},
				{
					// The dashboard is session-gated and ships `noindex, follow`.
					// `is-crawlable` would fail a correct robots tag and drag the
					// SEO category under 95, so the category is waived here and the
					// remaining SEO audits are still required.
					matchingUrlPattern: '.*/dashboard/.*',
					assertions: {
						...categories,
						...webVitals,
						'categories:seo': 'off',
						'is-crawlable': 'off',
						'document-title': 'error',
						'meta-description': 'error',
						'html-has-lang': 'error',
						hreflang: 'error',
						canonical: 'error'
					}
				}
			]
		},
		upload: {
			target: 'filesystem',
			outputDir: '.lighthouseci'
		}
	}
};
