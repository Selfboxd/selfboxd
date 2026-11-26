CREATE TABLE `list_tags` (
	`list_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`list_id`, `tag_id`),
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
