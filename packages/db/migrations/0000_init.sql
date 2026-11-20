CREATE TABLE `collection_items` (
	`collection_id` text NOT NULL,
	`item_id` text NOT NULL,
	`position` real,
	PRIMARY KEY(`collection_id`, `item_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_items_item_idx` ON `collection_items` (`item_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'series' NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "collections_kind" CHECK(kind IN ('series', 'show', 'playlist', 'course', 'list'))
);
--> statement-breakpoint
CREATE TABLE `field_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type_id` text,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`options` text,
	`required` integer DEFAULT false NOT NULL,
	`filterable` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`media_type_id`) REFERENCES `media_types`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "field_definitions_key_slug" CHECK("field_definitions"."key" NOT GLOB '*[^a-z0-9_]*' AND length("field_definitions"."key") BETWEEN 1 AND 64),
	CONSTRAINT "field_definitions_kind" CHECK(kind IN ('text', 'long_text', 'number', 'integer', 'date', 'boolean', 'url', 'select', 'multi_select', 'rating'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `field_definitions_type_key_uq` ON `field_definitions` (`media_type_id`,`key`) WHERE "field_definitions"."media_type_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `field_definitions_global_key_uq` ON `field_definitions` (`key`) WHERE "field_definitions"."media_type_id" IS NULL;--> statement-breakpoint
CREATE TABLE `item_identifiers` (
	`item_id` text NOT NULL,
	`scheme` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`item_id`, `scheme`, `value`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_identifiers_lookup_idx` ON `item_identifiers` (`scheme`,`value`);--> statement-breakpoint
CREATE TABLE `item_people` (
	`item_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`item_id`, `person_id`, `role`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "item_people_role" CHECK(role IN ('author', 'editor', 'translator', 'narrator', 'illustrator', 'host', 'guest', 'director', 'creator', 'instructor'))
);
--> statement-breakpoint
CREATE INDEX `item_people_person_idx` ON `item_people` (`person_id`,`role`);--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_tags_tag_idx` ON `item_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`media_type_id` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`sort_title` text,
	`description` text,
	`cover_path` text,
	`total_units` real,
	`unit` text,
	`minutes_per_unit` real,
	`language` text,
	`publisher` text,
	`published_on` text,
	`source_url` text,
	`fields` text DEFAULT '{}' NOT NULL,
	`locked_fields` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_type_id`) REFERENCES `media_types`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "items_total_units" CHECK("items"."total_units" IS NULL OR "items"."total_units" >= 0),
	CONSTRAINT "items_fields_json" CHECK(json_valid("items"."fields") AND json_type("items"."fields") = 'object')
);
--> statement-breakpoint
CREATE INDEX `items_media_type_idx` ON `items` (`media_type_id`);--> statement-breakpoint
CREATE INDEX `items_sort_title_idx` ON `items` ("sort_title" COLLATE NOCASE);--> statement-breakpoint
CREATE INDEX `items_created_at_idx` ON `items` (`created_at`);--> statement-breakpoint
CREATE TABLE `media_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_plural` text NOT NULL,
	`icon` text DEFAULT 'file' NOT NULL,
	`primary_unit` text NOT NULL,
	`builtin` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "media_types_id_slug" CHECK("media_types"."id" NOT GLOB '*[^a-z0-9_]*' AND length("media_types"."id") BETWEEN 1 AND 64),
	CONSTRAINT "media_types_unit" CHECK(primary_unit IN ('page', 'minute', 'episode', 'lesson', 'chapter', 'word', 'item', 'percent'))
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_name` text,
	`bio` text,
	`image_path` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `people_name_idx` ON `people` ("name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `tag_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_groups_name_uq` ON `tag_groups` ("name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`parent_id` text,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `tag_groups`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_group_name_uq` ON `tags` (`group_id`,"name" COLLATE NOCASE) WHERE "tags"."group_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `tags_ungrouped_name_uq` ON `tags` ("name" COLLATE NOCASE) WHERE "tags"."group_id" IS NULL;--> statement-breakpoint
CREATE INDEX `tags_parent_idx` ON `tags` (`parent_id`);--> statement-breakpoint
CREATE TABLE `consumptions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`format` text,
	`item_file_id` text,
	`started_on` text,
	`finished_on` text,
	`dropped_on` text,
	`rating` real,
	`review` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_file_id`) REFERENCES `item_files`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "consumptions_status" CHECK(status IN ('planned', 'in_progress', 'paused', 'completed', 'dropped')),
	CONSTRAINT "consumptions_format" CHECK(format IS NULL OR format IN ('print', 'ebook', 'audiobook', 'pdf', 'web', 'video', 'audio', 'other')),
	CONSTRAINT "consumptions_rating" CHECK("consumptions"."rating" IS NULL OR ("consumptions"."rating" >= 0 AND "consumptions"."rating" <= 5)),
	CONSTRAINT "consumptions_dates" CHECK(("consumptions"."started_on" IS NULL OR "consumptions"."finished_on" IS NULL OR "consumptions"."started_on" <= "consumptions"."finished_on"))
);
--> statement-breakpoint
CREATE INDEX `consumptions_item_idx` ON `consumptions` (`item_id`);--> statement-breakpoint
CREATE INDEX `consumptions_status_idx` ON `consumptions` (`status`);--> statement-breakpoint
CREATE INDEX `consumptions_finished_idx` ON `consumptions` (`finished_on`);--> statement-breakpoint
CREATE INDEX `consumptions_started_idx` ON `consumptions` (`started_on`);--> statement-breakpoint
CREATE TABLE `file_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_file_id` text NOT NULL,
	`consumption_id` text,
	`locator` text NOT NULL,
	`percent` real,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`item_file_id`) REFERENCES `item_files`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumption_id`) REFERENCES `consumptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `file_positions_file_uq` ON `file_positions` (`item_file_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`period` text NOT NULL,
	`start_on` text NOT NULL,
	`end_on` text NOT NULL,
	`metric` text NOT NULL,
	`unit` text,
	`target` real NOT NULL,
	`filter` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "goals_range" CHECK("goals"."start_on" <= "goals"."end_on"),
	CONSTRAINT "goals_target" CHECK("goals"."target" > 0)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`consumption_id` text,
	`item_file_id` text,
	`kind` text DEFAULT 'note' NOT NULL,
	`body` text NOT NULL,
	`locator` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumption_id`) REFERENCES `consumptions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`item_file_id`) REFERENCES `item_files`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "notes_kind" CHECK(kind IN ('note', 'quote', 'highlight'))
);
--> statement-breakpoint
CREATE INDEX `notes_item_idx` ON `notes` (`item_id`);--> statement-breakpoint
CREATE TABLE `progress_events` (
	`id` text PRIMARY KEY NOT NULL,
	`consumption_id` text NOT NULL,
	`item_id` text NOT NULL,
	`occurred_on` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`position` real,
	`delta` real DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`minutes_spent` real,
	`source` text DEFAULT 'manual' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`consumption_id`) REFERENCES `consumptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "progress_events_source" CHECK(source IN ('manual', 'viewer', 'import')),
	CONSTRAINT "progress_events_unit" CHECK(unit IN ('page', 'minute', 'episode', 'lesson', 'chapter', 'word', 'item', 'percent'))
);
--> statement-breakpoint
CREATE INDEX `progress_events_occurred_on_idx` ON `progress_events` (`occurred_on`);--> statement-breakpoint
CREATE INDEX `progress_events_consumption_idx` ON `progress_events` (`consumption_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `progress_events_item_idx` ON `progress_events` (`item_id`);--> statement-breakpoint
CREATE TABLE `item_files` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`role` text DEFAULT 'main' NOT NULL,
	`format` text NOT NULL,
	`mime` text NOT NULL,
	`original_name` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`storage_path` text NOT NULL,
	`label` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "item_files_role" CHECK(role IN ('main', 'alternate', 'snapshot', 'supplement')),
	CONSTRAINT "item_files_size" CHECK("item_files"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE INDEX `item_files_item_idx` ON `item_files` (`item_id`);--> statement-breakpoint
CREATE INDEX `item_files_sha256_idx` ON `item_files` (`sha256`);--> statement-breakpoint
CREATE TABLE `dashboards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_views` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`media_type_id` text,
	`filter` text,
	`view_mode` text DEFAULT 'grid' NOT NULL,
	`columns` text,
	`sort` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`media_type_id`) REFERENCES `media_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `widgets` (
	`id` text PRIMARY KEY NOT NULL,
	`dashboard_id` text NOT NULL,
	`type` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`layout` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`dashboard_id`) REFERENCES `dashboards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `widgets_dashboard_idx` ON `widgets` (`dashboard_id`);