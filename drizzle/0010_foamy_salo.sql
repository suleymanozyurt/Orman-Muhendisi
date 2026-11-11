CREATE TABLE `market_cart` (
	`user_id` text NOT NULL,
	`offering_id` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`user_id`, `offering_id`)
);
--> statement-breakpoint
CREATE TABLE `market_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`status` text NOT NULL,
	`items` text NOT NULL,
	`total_cents` integer NOT NULL,
	`buyer_name` text NOT NULL,
	`contact` text NOT NULL,
	`note` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `market_orders_buyer_idx` ON `market_orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `market_orders_seller_idx` ON `market_orders` (`seller_id`);--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`data` text NOT NULL,
	`seller` text NOT NULL,
	`price_cents` integer NOT NULL,
	`stock` integer NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `offerings_kind_status_idx` ON `offerings` (`kind`,`status`);--> statement-breakpoint
CREATE INDEX `offerings_user_idx` ON `offerings` (`user_id`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`author` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `resources_kind_status_idx` ON `resources` (`kind`,`status`);--> statement-breakpoint
CREATE INDEX `resources_user_idx` ON `resources` (`user_id`);