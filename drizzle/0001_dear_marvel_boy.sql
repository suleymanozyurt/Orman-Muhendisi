CREATE TABLE `species` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`latin` text NOT NULL,
	`family` text NOT NULL,
	`genus` text NOT NULL,
	`category` text NOT NULL,
	`leaf` text NOT NULL,
	`form` text NOT NULL,
	`range` text NOT NULL,
	`description` text NOT NULL,
	`leaf_note` text,
	`fruit_note` text,
	`source` text NOT NULL,
	`image_key` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
