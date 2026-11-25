CREATE TABLE `favourites` (
	`user_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`work_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `slot`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `diary_entries` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `location` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `banner_path` text;