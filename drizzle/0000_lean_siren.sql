CREATE TABLE `collection_items` (
	`collection_id` text NOT NULL,
	`plant_id` text NOT NULL,
	PRIMARY KEY(`collection_id`, `plant_id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`observation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`user_id` text NOT NULL,
	`observation_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `observation_id`)
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`text` text NOT NULL,
	`plant_id` text,
	`image_key` text,
	`organ` text,
	`latitude` text,
	`longitude` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_notes` (
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`user_id`, `plant_id`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saves` (
	`user_id` text NOT NULL,
	`item_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `item_id`)
);
