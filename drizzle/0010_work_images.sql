CREATE TABLE `work_images` (
	`user_id` integer NOT NULL,
	`work_id` integer NOT NULL,
	`poster_path` text,
	`backdrop_path` text,
	PRIMARY KEY(`user_id`, `work_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
