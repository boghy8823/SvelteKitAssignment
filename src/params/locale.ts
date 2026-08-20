import { isLocale, type Locale } from '$lib/i18n/locales';
import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Without this, `[locale]` swallows every first segment: /blog would resolve
 * with locale="blog" and render an English page at a URL that means something
 * else. The matcher is what makes every localized URL canonical.
 *
 * Declared as a type predicate rather than returning plain `boolean`, because
 * SvelteKit infers the param's type from the matcher's signature. That is what
 * types `params.locale` as `Locale` in every load under the segment, instead of
 * `string` re-narrowed at each use.
 */
export const match = ((param: string): param is Locale => isLocale(param)) satisfies ParamMatcher;
