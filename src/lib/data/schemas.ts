import { z } from 'zod';

import { locales } from '$lib/i18n/locales';

/*
 * The contract, translated from mocks/schemas.json. Every type in the app is
 * inferred from here, so a response shape cannot drift from what was validated.
 *
 * Objects are strict: an unexpected key means the data no longer matches the
 * contract, and finding that out at boot is the entire point of validating.
 */

const LocaleKey = z.enum(locales);

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

const HexColour = z.string().regex(HEX_COLOUR, 'Expected a 6-digit hex colour');

/** Tag slugs are validated against the taxonomy at boot rather than as an enum
 * here, so a new tag is a data change instead of a schema change. */
const TagSlug = z.string().min(1);

export const TranslationSchema = z.strictObject({
	title: z.string().min(1),
	excerpt: z.string().min(1),
	body: z.string().min(1)
});

export const AuthorSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	avatarColor: HexColour
});

export const PostSchema = z.strictObject({
	id: z.string().min(1),
	slug: z.string().min(1),
	// A complete record: every post must carry every locale, so rendering a
	// translated page never has to decide what to do about a missing one.
	translations: z.record(LocaleKey, TranslationSchema),
	tags: z.array(TagSlug),
	author: AuthorSchema,
	publishedAt: z.iso.datetime(),
	readingTimeMinutes: z.int().positive(),
	coverColor: HexColour
});

export const itemStatuses = [
	'draft',
	'scheduled',
	'active',
	'paused',
	'completed',
	'archived'
] as const;

export const itemChannels = ['email', 'sms', 'web', 'social', 'push'] as const;

export const ItemStatusSchema = z.enum(itemStatuses);
export const ItemChannelSchema = z.enum(itemChannels);

export const OwnerSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1)
});

export const ItemSchema = z.strictObject({
	id: z.string().min(1),
	name: z.string().min(1),
	status: ItemStatusSchema,
	channel: ItemChannelSchema,
	owner: OwnerSchema,
	budget: z.number().nonnegative(),
	spent: z.number().nonnegative(),
	impressions: z.int().nonnegative(),
	clicks: z.int().nonnegative(),
	ctr: z.number().min(0).max(1),
	startDate: z.iso.date(),
	endDate: z.iso.date(),
	updatedAt: z.iso.datetime(),
	tags: z.array(TagSlug)
});

export const userRoles = ['admin', 'editor', 'viewer'] as const;

export const UserRoleSchema = z.enum(userRoles);

/** Shape is fixed by the brief; it is used to test login, so it is not extended. */
export const UserSchema = z.strictObject({
	id: z.string().min(1),
	email: z.email(),
	password: z.string().min(1),
	name: z.string().min(1),
	role: UserRoleSchema
});

export const TagSchema = z.strictObject({
	slug: TagSlug,
	label: z.record(LocaleKey, z.string().min(1))
});

/** Flat dot-notation keys; `{placeholders}` are interpolation slots. */
export const DictionarySchema = z.record(z.string(), z.string());

export type Translation = z.infer<typeof TranslationSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ItemStatus = z.infer<typeof ItemStatusSchema>;
export type ItemChannel = z.infer<typeof ItemChannelSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Dictionary = z.infer<typeof DictionarySchema>;
