CREATE TABLE `api_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`body` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `api_cache_expires_at_index` ON `api_cache` (`expires_at`);--> statement-breakpoint
CREATE TABLE `instance_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
