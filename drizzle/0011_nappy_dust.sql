CREATE TABLE `follows` (
	`follower_id` text NOT NULL,
	`followed_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`follower_id`, `followed_id`)
);
--> statement-breakpoint
CREATE INDEX `follows_target_idx` ON `follows` (`followed_id`);