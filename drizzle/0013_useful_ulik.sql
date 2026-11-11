CREATE TABLE `taxon_visits` (
	`taxon_id` text NOT NULL,
	`visitor_id` text NOT NULL,
	`day` text NOT NULL,
	`taxon` text NOT NULL,
	PRIMARY KEY(`taxon_id`, `visitor_id`, `day`)
);
--> statement-breakpoint
CREATE INDEX `taxon_visits_day_idx` ON `taxon_visits` (`day`);