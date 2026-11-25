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
		kind: text('kind', { enum: ['film'] }).notNull(),
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
		rating: integer('rating'),
		liked: integer('liked', { mode: 'boolean' }).notNull().default(false),
		rewatch: integer('rewatch', { mode: 'boolean' }).notNull().default(false),
		review: text('review').notNull().default(''),
		containsSpoilers: integer('contains_spoilers', { mode: 'boolean' }).notNull().default(false),
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
