CREATE TABLE `public_profiles` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`key_seed` text NOT NULL,
	`access_code` text,
	`pending` integer DEFAULT true NOT NULL,
	`synced_at` integer,
	`last_error` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shared_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`source` text NOT NULL,
	`reference` text NOT NULL,
	`url` text NOT NULL,
	`code` text NOT NULL,
	`manage_token` text NOT NULL,
	`shared_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shared_lists_user_source_reference_unique` ON `shared_lists` (`user_id`,`source`,`reference`);