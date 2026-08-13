CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`contact` text NOT NULL,
	`model_id` text NOT NULL,
	`model_name` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_date_time_unique` ON `bookings` (`date`,`time`);--> statement-breakpoint
CREATE INDEX `idx_bookings_date` ON `bookings` (`date`);