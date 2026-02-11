import { db } from "./db";
import { 
  users, orders, boxes, materials, locations, auditLogs, settings,
  type User, type InsertUser, type Order, type InsertBox, type Box,
  type Material, type InsertMaterial, type Location, type AuditLog,
  type Settings
} from "@shared/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Orders
  getOrders(status?: string, search?: string): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: Partial<Order>): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;

  // Boxes
  createBox(box: InsertBox): Promise<Box>;
  getBox(id: number): Promise<Box | undefined>;
  getBoxesByOrder(orderId: number): Promise<Box[]>;
  updateBox(id: number, updates: Partial<Box>): Promise<Box>;
  getBoxStats(): Promise<{ totalInStock: number; shippedToday: number }>;

  // Materials
  getMaterials(type?: string, search?: string): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, updates: Partial<Material>): Promise<Material>;
  getMaterial(id: number): Promise<Material | undefined>;

  // Locations
  getLocations(): Promise<Location[]>;
  getLocationByQr(uuid: string): Promise<Location | undefined>;
  createLocation(location: Partial<Location>): Promise<Location>;

  // Audit
  createAuditLog(log: Partial<AuditLog>): Promise<AuditLog>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<Settings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // === USERS ===
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // === ORDERS ===
  async getOrders(status?: string, search?: string): Promise<Order[]> {
    let query = db.select().from(orders);
    const conditions = [];
    
    if (status) conditions.push(eq(orders.status, status));
    if (search) conditions.push(ilike(orders.number, `%${search}%`));
    
    if (conditions.length > 0) {
      // @ts-ignore - complex query construction
      query = query.where(or(...conditions)); 
    }
    
    return await query.orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order as any).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order;
  }

  // === BOXES ===
  async createBox(box: InsertBox): Promise<Box> {
    const [newBox] = await db.insert(boxes).values(box).returning();
    return newBox;
  }

  async getBox(id: number): Promise<Box | undefined> {
    const [box] = await db.select().from(boxes).where(eq(boxes.id, id));
    return box;
  }

  async getBoxesByOrder(orderId: number): Promise<Box[]> {
    return await db.select().from(boxes).where(eq(boxes.orderId, orderId));
  }

  async updateBox(id: number, updates: Partial<Box>): Promise<Box> {
    const [box] = await db.update(boxes).set(updates).where(eq(boxes.id, id)).returning();
    return box;
  }

  async getBoxStats(): Promise<{ totalInStock: number; shippedToday: number }> {
    const [inStock] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(eq(boxes.status, 'in_stock'));
      
    // Simplified "shipped today" logic
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const [shipped] = await db
      .select({ count: sql<number>`count(*)` })
      .from(boxes)
      .where(sql`${boxes.shippedAt} >= ${today}`);

    return {
      totalInStock: Number(inStock?.count || 0),
      shippedToday: Number(shipped?.count || 0)
    };
  }

  // === MATERIALS ===
  async getMaterials(type?: string, search?: string): Promise<Material[]> {
    let query = db.select().from(materials);
    // Simple implementation for now
    return await query.orderBy(desc(materials.createdAt));
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMat] = await db.insert(materials).values(material).returning();
    return newMat;
  }

  async updateMaterial(id: number, updates: Partial<Material>): Promise<Material> {
    const [mat] = await db.update(materials).set(updates).where(eq(materials.id, id)).returning();
    return mat;
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [mat] = await db.select().from(materials).where(eq(materials.id, id));
    return mat;
  }

  // === LOCATIONS ===
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocationByQr(uuid: string): Promise<Location | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.qrUuid, uuid));
    return loc;
  }

  async createLocation(location: Partial<Location>): Promise<Location> {
    const [loc] = await db.insert(locations).values(location as any).returning();
    return loc;
  }

  // === AUDIT ===
  async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log as any).returning();
    return newLog;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
  }

  // === SETTINGS ===
  async getSettings(): Promise<Settings> {
    const [s] = await db.select().from(settings).limit(1);
    if (s) return s;
    const [newS] = await db.insert(settings).values({}).returning();
    return newS;
  }

  async updateSettings(updates: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const [s] = await db.update(settings).set(updates).where(eq(settings.id, current.id)).returning();
    return s;
  }
}

export const storage = new DatabaseStorage();
