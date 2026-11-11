CREATE TABLE `care_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`action` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `care_events_user_idx` ON `care_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `care_plants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`guide` text NOT NULL,
	`location` text NOT NULL,
	`light` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `care_plants_user_idx` ON `care_plants` (`user_id`);--> statement-breakpoint
CREATE TABLE `care_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`due_at` text NOT NULL,
	`interval_days` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`last_action` text
);
--> statement-breakpoint
CREATE INDEX `care_tasks_user_due_idx` ON `care_tasks` (`user_id`,`due_at`);