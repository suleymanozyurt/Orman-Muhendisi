CREATE TABLE `identifications` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`plant_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);
