CREATE TABLE `liked_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`source` text NOT NULL,
	`reference` text NOT NULL,
	`name` text NOT NULL,
	`owner` text,
	`item_count` integer,
	`preview` text DEFAULT '[]' NOT NULL,
	`liked_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `liked_lists_user_source_reference_unique` ON `liked_lists` (`user_id`,`source`,`reference`);