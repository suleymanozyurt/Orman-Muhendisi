CREATE TABLE `taxonomy_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`source_id` text,
	`kind` text NOT NULL,
	`old_data` text,
	`new_data` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `taxonomy_changes_source_idx` ON `taxonomy_changes` (`source`,`version`);--> statement-breakpoint
CREATE TABLE `taxonomy_nodes` (
	`key` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`source_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`rank` text NOT NULL,
	`status` text NOT NULL,
	`search_text` text NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `taxonomy_parent_idx` ON `taxonomy_nodes` (`source`,`version`,`parent_id`);--> statement-breakpoint
CREATE INDEX `taxonomy_name_idx` ON `taxonomy_nodes` (`source`,`name`);--> statement-breakpoint
CREATE INDEX `taxonomy_record_idx` ON `taxonomy_nodes` (`source`,`source_id`);--> statement-breakpoint
CREATE TABLE `taxonomy_pages` (
	`key` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`parent_id` text,
	`cursor` text NOT NULL,
	`data` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `taxonomy_releases` (
	`key` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`version` text NOT NULL,
	`source_url` text NOT NULL,
	`license` text NOT NULL,
	`expected_count` integer,
	`complete` integer DEFAULT false NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
