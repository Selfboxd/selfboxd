CREATE TABLE `diary_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`watched_on` text NOT NULL,
	`rating` integer,
	`liked` integer DEFAULT false NOT NULL,
	`rewatch` integer DEFAULT false NOT NULL,
	`review` text DEFAULT '' NOT NULL,
	`contains_spoilers` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diary_entries_user_watched_on_index` ON `diary_entries` (`user_id`,`watched_on`);--> statement-breakpoint
CREATE TABLE `diary_entry_tags` (
	`entry_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`entry_id`, `tag_id`),
	FOREIGN KEY (`entry_id`) REFERENCES `diary_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_kind_name_unique` ON `tags` (`user_id`,`kind`,`name`);--> statement-breakpoint
CREATE TABLE `watchlist_item_tags` (
	`item_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_items_user_work_unique` ON `watchlist_items` (`user_id`,`work_id`);--> statement-breakpoint
CREATE TABLE `work_states` (
	`user_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`watched` integer DEFAULT false NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	`rating` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `work_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `works` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`poster_path` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `works_kind_external_id_unique` ON `works` (`kind`,`external_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `rating_scale` text DEFAULT 'stars' NOT NULL;