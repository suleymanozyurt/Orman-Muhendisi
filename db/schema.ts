import { integer, index, uniqueIndex, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  languageChoice:text("language_choice").notNull().default("auto"),
  themeChoice:text("theme_choice").notNull().default("system"),
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  author: text("author").notNull(),
  text: text("text").notNull(),
  plantId: text("plant_id"),
  imageKey: text("image_key"),
  organ: text("organ"),
  linkPreview: text("link_preview"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().default("approved"),
  observedAt: text("observed_at"),
  reviewNote: text("review_note"),
  createdAt: text("created_at").notNull(),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  observationId: text("observation_id").notNull(),
  userId: text("user_id").notNull(),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const likes = sqliteTable("likes", {
  userId: text("user_id").notNull(),
  observationId: text("observation_id").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.observationId] })]);

export const saves = sqliteTable("saves", {
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.itemId] })]);

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const collectionItems = sqliteTable("collection_items", {
  collectionId: text("collection_id").notNull(),
  plantId: text("plant_id").notNull(),
}, table => [primaryKey({ columns: [table.collectionId, table.plantId] })]);

export const personalNotes = sqliteTable("personal_notes", {
  userId: text("user_id").notNull(),
  plantId: text("plant_id").notNull(),
  kind: text("kind").notNull(),
  value: text("value").notNull(),
}, table => [primaryKey({ columns: [table.userId, table.plantId, table.kind] })]);

export const species = sqliteTable("species", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  latin: text("latin").notNull(),
  family: text("family").notNull(),
  genus: text("genus").notNull(),
  category: text("category").notNull(),
  leaf: text("leaf").notNull(),
  form: text("form").notNull(),
  habitat: text("habitat"),
  growth: text("growth"),
  height: text("height"),
  life: text("life"),
  light: text("light"),
  humidity: text("humidity"),
  soil: text("soil"),
  range: text("range").notNull(),
  description: text("description").notNull(),
  leafNote: text("leaf_note"),
  fruitNote: text("fruit_note"),
  ecology: text("ecology"),
  source: text("source").notNull(),
  imageKey: text("image_key"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
});

export const identifications = sqliteTable("identifications", {
  id: text("id").primaryKey(),
  observationId: text("observation_id").notNull(),
  userId: text("user_id").notNull(),
  author: text("author").notNull(),
  plantId: text("plant_id").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const uploads = sqliteTable("uploads", { key: text("key").primaryKey(), userId: text("user_id").notNull(), createdAt: text("created_at").notNull() });
export const observationPhotos = sqliteTable("observation_photos", { observationId: text("observation_id").notNull(), imageKey: text("image_key").notNull(), organ: text("organ"), position: text("position").notNull() }, table => [primaryKey({ columns: [table.observationId, table.imageKey] })]);

export const carePlants = sqliteTable("care_plants", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), name: text("name").notNull(),
  species: text("species").notNull(), guide: text("guide").notNull(), location: text("location").notNull(),
  light: text("light").notNull(), createdAt: text("created_at").notNull(),
}, t => [index("care_plants_user_idx").on(t.userId)]);
export const careTasks = sqliteTable("care_tasks", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), plantId: text("plant_id").notNull(),
  title: text("title").notNull(), kind: text("kind").notNull(), dueAt: text("due_at").notNull(),
  intervalDays: integer("interval_days").notNull(), revision: integer("revision").notNull().default(0),
  active: integer("active").notNull().default(1), lastAction: text("last_action"),
}, t => [index("care_tasks_user_due_idx").on(t.userId,t.dueAt)]);
export const careEvents = sqliteTable("care_events", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(), plantId: text("plant_id").notNull(),
  taskId: text("task_id").notNull(), title: text("title").notNull(), kind: text("kind").notNull(),
  action: text("action").notNull(), note: text("note").notNull(), createdAt: text("created_at").notNull(),
}, t => [index("care_events_user_idx").on(t.userId,t.createdAt)]);
export const vernacularNames = sqliteTable("vernacular_names", {
 id:text("id").primaryKey(), userId:text("user_id").notNull(), plantId:text("plant_id").notNull(),
 name:text("name").notNull(), region:text("region").notNull(), author:text("author").notNull(), createdAt:text("created_at").notNull(),
},t=>[index("vernacular_names_plant_idx").on(t.plantId)]);
export const floraDetails = sqliteTable("flora_details", { id:integer("id").primaryKey(), data:text("data").notNull(), fetchedAt:text("fetched_at").notNull() });

export const resources = sqliteTable("resources", { id:text("id").primaryKey(),userId:text("user_id").notNull(),kind:text("kind").notNull(),title:text("title").notNull(),status:text("status").notNull(),data:text("data").notNull(),author:text("author").notNull(),revision:integer("revision").notNull().default(0),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull() },t=>[index("resources_kind_status_idx").on(t.kind,t.status),index("resources_user_idx").on(t.userId)]);
export const offerings = sqliteTable("offerings", {id:text("id").primaryKey(),userId:text("user_id").notNull(),kind:text("kind").notNull(),title:text("title").notNull(),data:text("data").notNull(),seller:text("seller").notNull(),priceCents:integer("price_cents").notNull(),stock:integer("stock").notNull(),status:text("status").notNull(),revision:integer("revision").notNull().default(0),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull()},t=>[index("offerings_kind_status_idx").on(t.kind,t.status),index("offerings_user_idx").on(t.userId)]);
export const marketCart = sqliteTable("market_cart", {userId:text("user_id").notNull(),offeringId:text("offering_id").notNull(),quantity:integer("quantity").notNull()},t=>[primaryKey({columns:[t.userId,t.offeringId]})]);
export const marketOrders = sqliteTable("market_orders", {id:text("id").primaryKey(),userId:text("user_id").notNull(),sellerId:text("seller_id").notNull(),status:text("status").notNull(),items:text("items").notNull(),totalCents:integer("total_cents").notNull(),buyerName:text("buyer_name").notNull(),contact:text("contact").notNull(),note:text("note").notNull(),revision:integer("revision").notNull().default(0),createdAt:text("created_at").notNull()},t=>[index("market_orders_buyer_idx").on(t.userId),index("market_orders_seller_idx").on(t.sellerId)]);

export const follows = sqliteTable("follows", {
  followerId: text("follower_id").notNull(),
  followedId: text("followed_id").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [primaryKey({columns:[table.followerId,table.followedId]}),index("follows_target_idx").on(table.followedId)]);

export const taxonVisits = sqliteTable("taxon_visits", {
  taxonId:text("taxon_id").notNull(),visitorId:text("visitor_id").notNull(),day:text("day").notNull(),
  taxon:text("taxon").notNull(),
},table=>[primaryKey({columns:[table.taxonId,table.visitorId,table.day]}),index("taxon_visits_day_idx").on(table.day),index("taxon_visits_visitor_day_idx").on(table.visitorId,table.day)]);

// Source graphs and release identities are deliberately separate. Never merge by name.
export const taxonomyNodes=sqliteTable("taxonomy_nodes",{
 key:text("key").primaryKey(),source:text("source").notNull(),version:text("version").notNull(),
 sourceId:text("source_id").notNull(),parentId:text("parent_id"),name:text("name").notNull(),
 rank:text("rank").notNull(),status:text("status").notNull(),searchText:text("search_text").notNull(),
 data:text("data").notNull(),fetchedAt:text("fetched_at").notNull(),
},t=>[index("taxonomy_parent_idx").on(t.source,t.version,t.parentId),index("taxonomy_name_idx").on(t.source,t.name),index("taxonomy_record_idx").on(t.source,t.sourceId),uniqueIndex("taxonomy_identity_unique").on(t.source,t.version,t.sourceId)]);
export const taxonomyPages=sqliteTable("taxonomy_pages",{
 key:text("key").primaryKey(),source:text("source").notNull(),version:text("version").notNull(),
 parentId:text("parent_id"),cursor:text("cursor").notNull(),data:text("data").notNull(),fetchedAt:text("fetched_at").notNull(),
});
export const taxonomyReleases=sqliteTable("taxonomy_releases",{
 key:text("key").primaryKey(),source:text("source").notNull(),version:text("version").notNull(),
 sourceUrl:text("source_url").notNull(),license:text("license").notNull(),expectedCount:integer("expected_count"),
 complete:integer("complete",{mode:"boolean"}).notNull().default(false),data:text("data").notNull(),updatedAt:text("updated_at").notNull(),
});
export const taxonomyChanges=sqliteTable("taxonomy_changes",{
 id:text("id").primaryKey(),source:text("source").notNull(),version:text("version").notNull(),sourceId:text("source_id"),
 kind:text("kind").notNull(),oldData:text("old_data"),newData:text("new_data"),createdAt:text("created_at").notNull(),
},t=>[index("taxonomy_changes_source_idx").on(t.source,t.version)]);
