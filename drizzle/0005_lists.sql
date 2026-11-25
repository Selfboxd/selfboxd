CREATE TABLE `list_items` (
	`list_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`position` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`list_id`, `work_id`),
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`ranked` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lists_user_index` ON `lists` (`user_id`);