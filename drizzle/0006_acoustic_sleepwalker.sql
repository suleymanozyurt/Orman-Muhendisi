CREATE TABLE `observation_photos` (
	`observation_id` text NOT NULL,
	`image_key` text NOT NULL,
	`organ` text,
	`position` text NOT NULL,
	PRIMARY KEY(`observation_id`, `image_key`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `observations` ADD `status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `observations` ADD `observed_at` text;--> statement-breakpoint
ALTER TABLE `observations` ADD `review_note` text;