import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS & TYPES ===
export const ROLES = ['admin', 'operator'] as const;
export const ORDER_STATUS = ['active', 'completed'] as const;
export const BOX_STATUS = ['in_stock', 'shipped'] as const;
export const MATERIAL_STATUS = ['in_stock', 'issued'] as const;
export const LOCATION_TYPE = ['permanent', 'temporary'] as const;
export const MATERIAL_TYPE = ['raw', 'client_supplied', 'tool'] as const;

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // using email as username
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ROLES }).notNull().default('operator'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Rack A, Shelf 3"
  qrUuid: text("qr_uuid").notNull().unique(),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(), // User-friendly ID
  customer: text("customer"),
  status: text("status", { enum: ORDER_STATUS }).notNull().default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const boxes = pgTable("boxes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  numberInOrder: text("number_in_order").notNull(), // e.g., "3/8"
  quantity: integer("quantity").notNull(),
  
  locationType: text("location_type", { enum: LOCATION_TYPE }).notNull(),
  locationId: integer("location_id").references(() => locations.id), // If permanent
  tempLocationPhoto: text("temp_location_photo"), // If temporary
  tempLocationDesc: text("temp_location_desc"),   // If temporary
  
  status: text("status", { enum: BOX_STATUS }).notNull().default('in_stock'),
  shippedAt: timestamp("shipped_at"),
  shippedBy: integer("shipped_by").references(() => users.id),
  
  productPhotos: text("product_photos").array(), // Array of URLs/Base64
  stickerPhoto: text("sticker_photo"),
  
  problemType: text("problem_type"),
  problemDesc: text("problem_desc"),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  type: text("type", { enum: MATERIAL_TYPE }).notNull(),
  counterparty: text("counterparty"), // Supplier or Client name
  orderNumber: text("order_number"), // Optional binding
  description: text("description").notNull(),
  quantity: integer("quantity"),
  unit: text("unit"), // "sheets", "kg", etc.
  
  locationType: text("location_type", { enum: LOCATION_TYPE }).notNull(),
  locationId: integer("location_id").references(() => locations.id),
  tempLocationPhoto: text("temp_location_photo"),
  tempLocationDesc: text("temp_location_desc"),
  
  status: text("status", { enum: MATERIAL_STATUS }).notNull().default('in_stock'),
  issuedAt: timestamp("issued_at"),
  issuedReason: text("issued_reason"),
  
  photos: text("photos").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userName: text("user_name").notNull(),
  actionType: text("action_type").notNull(), // create, update, ship, etc.
  entityType: text("entity_type").notNull(), // order, box, material
  entityId: text("entity_id").notNull(), // ID as string
  details: jsonb("details"), // Store old/new data or comments
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  photoRetentionDays: integer("photo_retention_days").default(30),
  organizationName: text("organization_name").default("My Printing House"),
  qrLabelSize: text("qr_label_size").default("medium"),
  qrIncludeText: boolean("qr_include_text").default(true),
});

// === RELATIONS ===
export const ordersRelations = relations(orders, ({ many }) => ({
  boxes: many(boxes),
}));

export const boxesRelations = relations(boxes, ({ one }) => ({
  order: one(orders, {
    fields: [boxes.orderId],
    references: [orders.id],
  }),
  location: one(locations, {
    fields: [boxes.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [boxes.createdBy],
    references: [users.id],
  }),
  shipper: one(users, {
    fields: [boxes.shippedBy],
    references: [users.id],
  }),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  location: one(locations, {
    fields: [materials.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [materials.createdBy],
    references: [users.id],
  }),
}));

// === ZOD SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, completedAt: true });
export const insertBoxSchema = createInsertSchema(boxes).omit({ id: true, createdAt: true, shippedAt: true, shippedBy: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true, issuedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Location = typeof locations.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Box = typeof boxes.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Settings = typeof settings.$inferSelect;

export type InsertBox = z.infer<typeof insertBoxSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
