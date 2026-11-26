import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	avatarVersion: integer('avatar_version'),
	ratingScale: text('rating_scale', { enum: ['stars', 'ten'] })
		.notNull()
		.default('stars'),
	bio: text('bio').notNull().default(''),
	location: text('location').notNull().default(''),
	bannerPath: text('banner_path'),
	/** Address of a website shown on the profile. */
	website: text('website').notNull().default(''),
	/** Instagram and X usernames shown on the profile. */
	instagram: text('instagram').notNull().default(''),
	xHandle: text('x_handle').notNull().default(''),
	/** ISO 3166-1 code of the country of the account, for releases and streaming offers. */
	country: text('country'),
	/** Whether the watchlist stays out of the public profile. */
	watchlistPrivate: integer('watchlist_private', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const sessions = sqliteTable(
	'sessions',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		tokenHash: text('token_hash').notNull().unique(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['browser', 'device'] }).notNull(),
		label: text('label').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [index('sessions_user_id_index').on(table.userId)]
);

export const loginThrottles = sqliteTable('login_throttles', {
	username: text('username').primaryKey(),
	failures: integer('failures').notNull(),
	lastFailureAt: integer('last_failure_at', { mode: 'timestamp' }).notNull(),
	lockedUntil: integer('locked_until', { mode: 'timestamp' }).notNull()
});

export const instanceSettings = sqliteTable('instance_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const apiCache = sqliteTable(
	'api_cache',
	{
		key: text('key').primaryKey(),
		body: text('body').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [index('api_cache_expires_at_index').on(table.expiresAt)]
);

export const works = sqliteTable(
	'works',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		kind: text('kind', { enum: ['film', 'series'] }).notNull(),
		externalId: text('external_id').notNull(),
		title: text('title').notNull(),
		year: integer('year'),
		posterPath: text('poster_path')
	},
	(table) => [uniqueIndex('works_kind_external_id_unique').on(table.kind, table.externalId)]
);

export const workStates = sqliteTable(
	'work_states',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' }),
		watched: integer('watched', { mode: 'boolean' }).notNull().default(false),
		liked: integer('liked', { mode: 'boolean' }).notNull().default(false),
		rating: integer('rating'),
		status: text('status', { enum: ['watching', 'finished', 'abandoned'] }),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [primaryKey({ columns: [table.userId, table.workId] })]
);

export const diaryEntries = sqliteTable(
	'diary_entries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' }),
		watchedOn: text('watched_on').notNull(),
		season: integer('season'),
		rating: integer('rating'),
		liked: integer('liked', { mode: 'boolean' }).notNull().default(false),
		rewatch: integer('rewatch', { mode: 'boolean' }).notNull().default(false),
		review: text('review').notNull().default(''),
		containsSpoilers: integer('contains_spoilers', { mode: 'boolean' }).notNull().default(false),
		pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
	},
	(table) => [index('diary_entries_user_watched_on_index').on(table.userId, table.watchedOn)]
);

export const tags = sqliteTable(
	'tags',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['diary', 'watchlist'] }).notNull(),
		name: text('name').notNull()
	},
	(table) => [uniqueIndex('tags_user_kind_name_unique').on(table.userId, table.kind, table.name)]
);

export const diaryEntryTags = sqliteTable(
	'diary_entry_tags',
	{
		entryId: integer('entry_id')
			.notNull()
			.references(() => diaryEntries.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.entryId, table.tagId] })]
);

export const watchlistItems = sqliteTable(
	'watchlist_items',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' }),
		note: text('note').notNull().default(''),
		addedAt: integer('added_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [uniqueIndex('watchlist_items_user_work_unique').on(table.userId, table.workId)]
);

export const watchlistItemTags = sqliteTable(
	'watchlist_item_tags',
	{
		itemId: integer('item_id')
			.notNull()
			.references(() => watchlistItems.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.itemId, table.tagId] })]
);

export const lists = sqliteTable(
	'lists',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		ranked: integer('ranked', { mode: 'boolean' }).notNull().default(false),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('lists_user_index').on(table.userId)]
);

export const listItems = sqliteTable(
	'list_items',
	{
		listId: integer('list_id')
			.notNull()
			.references(() => lists.id, { onDelete: 'cascade' }),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		note: text('note').notNull().default('')
	},
	(table) => [primaryKey({ columns: [table.listId, table.workId] })]
);

export const favourites = sqliteTable(
	'favourites',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		slot: integer('slot').notNull(),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.userId, table.slot] })]
);

export const likedLists = sqliteTable(
	'liked_lists',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		source: text('source', { enum: ['personal', 'public', 'chart'] }).notNull(),
		reference: text('reference').notNull(),
		name: text('name').notNull(),
		owner: text('owner'),
		itemCount: integer('item_count'),
		preview: text('preview').notNull().default('[]'),
		likedAt: integer('liked_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		uniqueIndex('liked_lists_user_source_reference_unique').on(
			table.userId,
			table.source,
			table.reference
		)
	]
);

/** Streaming services an account uses, by TMDB provider identifier. */
export const userServices = sqliteTable(
	'user_services',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		providerId: integer('provider_id').notNull()
	},
	(table) => [primaryKey({ columns: [table.userId, table.providerId] })]
);

/** Poster and backdrop an account chose for a work in place of those of TMDB. */
export const workImages = sqliteTable(
	'work_images',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		workId: integer('work_id')
			.notNull()
			.references(() => works.id, { onDelete: 'cascade' }),
		posterPath: text('poster_path'),
		backdropPath: text('backdrop_path')
	},
	(table) => [primaryKey({ columns: [table.userId, table.workId] })]
);

/** Public profile of an account on the platform, published with its own key pair. */
export const publicProfiles = sqliteTable('public_profiles', {
	userId: integer('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	/** Address of the profile on the platform, such as `ada` for `sbxd.link/ada`. */
	handle: text('handle').notNull(),
	/** Ed25519 private key of the account, as base64url of its 32-byte seed. */
	keySeed: text('key_seed').notNull(),
	/** Four-digit code protecting the profile, or `null` for a profile open to everyone. */
	accessCode: text('access_code'),
	/** Whether a change still waits to be sent to the platform. */
	pending: integer('pending', { mode: 'boolean' }).notNull().default(true),
	syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
	/** Code of the last error the platform or the network gave, if the last send failed. */
	lastError: text('last_error')
});

/** Lists of an account shared on the platform, with what it needs to change or stop sharing. */
export const sharedLists = sqliteTable(
	'shared_lists',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		source: text('source', { enum: ['personal', 'public', 'chart'] }).notNull(),
		reference: text('reference').notNull(),
		/** Address of the shared list on the platform. */
		url: text('url').notNull(),
		code: text('code').notNull(),
		manageToken: text('manage_token').notNull(),
		sharedAt: integer('shared_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		uniqueIndex('shared_lists_user_source_reference_unique').on(
			table.userId,
			table.source,
			table.reference
		)
	]
);
