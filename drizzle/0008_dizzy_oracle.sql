CREATE TABLE `vernacular_names` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`name` text NOT NULL,
	`region` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vernacular_names_plant_idx` ON `vernacular_names` (`plant_id`);