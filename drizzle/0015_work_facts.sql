CREATE TABLE `work_facts` (
	`work_id` integer PRIMARY KEY NOT NULL,
	`facts` text NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`work_id`) REFERENCES `works`(`id`) ON UPDATE no action ON DELETE cascade
);
