import { isLocale } from '$lib/i18n/locales';
import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Without this, `[locale]` swallows every first segment: /blog would resolve
 * with locale="blog" and render an English page at a URL that means something
 * else. The matcher is what makes every localized URL canonical.
 */
export const match = ((param: string) => isLocale(param)) satisfies ParamMatcher;
