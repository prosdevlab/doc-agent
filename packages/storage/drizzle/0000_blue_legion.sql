CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT '"2025-12-07T11:19:23.284Z"' NOT NULL
);
