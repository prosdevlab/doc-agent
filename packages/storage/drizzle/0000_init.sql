CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`path_hash` text NOT NULL,
	`filename` text NOT NULL,
	`content_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT '"2025-12-07T19:46:45.333Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_path_hash_unique` ON `documents` (`path_hash`);