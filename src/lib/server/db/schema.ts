import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	avatarVersion: integer('avatar_version'),
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
