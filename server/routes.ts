import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

const SessionStore = MemoryStore(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === MIDDLEWARE ===
  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: 'keyboard cat' // In production this should be env var
  }));

  // === SEED DATA ===
  await seedDatabase();

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    const { username, password } = req.body;
    // Simple mock auth logic as per PDF requirements
    // In real app, check password hash. Here, "any password works".
    
    let user = await storage.getUserByUsername(username);
    
    if (!user) {
      // Create user on fly if not exists (for demo purposes as per "mock" feel)
      // Or reject. PDF says: "email includes admin -> role admin, else operator"
      const role = username.includes('admin') ? 'admin' : 'operator';
      user = await storage.createUser({
        username,
        password: 'hashed_password', // Mock
        name: username.split('@')[0] || 'User',
        role,
        isActive: true
      });
    }

    // @ts-ignore
    req.session.userId = user.id;
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.json(null);
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    res.json(user || null);
  });

  // === ORDERS ===
  app.get(api.orders.list.path, async (req, res) => {
    const { status, search } = req.query as any;
    const orders = await storage.getOrders(status, search);
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      const order = await storage.createOrder(input);
      
      // Audit
      // @ts-ignore
      if (req.session.userId) {
        // @ts-ignore
        const user = await storage.getUser(req.session.userId);
        await storage.createAuditLog({
            userId: user!.id,
            userName: user!.name,
            actionType: 'create',
            entityType: 'order',
            entityId: String(order.id),
            details: { input }
        });
      }

      res.status(201).json(order);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.orders.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Not found" });
    const boxes = await storage.getBoxesByOrder(id);
    res.json({ ...order, boxes });
  });

  // === BOXES ===
  app.get(api.boxes.list.path, async (_req, res) => {
    try {
      const boxes = await storage.getBoxes();
      res.json(boxes);
    } catch (e: any) {
      console.error("GET /api/boxes error:", e);
      res.status(500).json({ message: e.message || "Internal Server Error" });
    }
  });

  app.post(api.boxes.create.path, async (req, res) => {
    try {
        console.log("Creating box with payload:", JSON.stringify(req.body, null, 2));
        const input = api.boxes.create.input.parse(req.body);
        const box = await storage.createBox(input);
        res.status(201).json(box);
    } catch (e: any) {
        console.error("BOX CREATION ERROR:", e);
        if (e instanceof z.ZodError) {
            console.error("Zod Validation Error:", JSON.stringify(e.errors, null, 2));
            return res.status(400).json({ message: "Validation failed", errors: e.errors });
        }
        res.status(400).json({ 
          message: "Internal error during creation", 
          error: e.message 
        });
    }
  });

  // === MOVE BOXES ===
  app.post('/api/boxes/move', async (req, res) => {
    try {
      const { boxIds, locationId, newOrderNumber, splitFromOrderId } = req.body;

      if (!Array.isArray(boxIds) || boxIds.length === 0 || !locationId) {
        return res.status(400).json({ message: "boxIds and locationId are required" });
      }

      let targetOrderId: number | null = null;

      // If splitting, create a new order first
      if (newOrderNumber && splitFromOrderId) {
        const sourceOrder = await storage.getOrder(Number(splitFromOrderId));
        const newOrder = await storage.createOrder({
          number: newOrderNumber,
          customer: sourceOrder?.customer || null,
          status: 'active',
        });
        targetOrderId = newOrder.id;
      }

      // Update each box
      const movedBoxes = [];
      for (const rawId of boxIds) {
        const boxId = Number(rawId);
        const box = await storage.getBox(boxId);
        if (!box || box.status !== 'in_stock') continue;

        const updates: any = { locationId: Number(locationId) };
        if (targetOrderId) {
          updates.orderId = targetOrderId;
          updates.manualOrderNumber = newOrderNumber;
        }

        const updated = await storage.updateBox(boxId, updates);
        movedBoxes.push(updated);
      }

      // Audit log
      // @ts-ignore
      const userId = req.session?.userId;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          await storage.createAuditLog({
            userId: user.id,
            userName: user.name,
            actionType: 'move',
            entityType: 'boxes',
            entityId: boxIds.join(','),
            details: { boxIds, locationId, newOrderNumber, splitFromOrderId, movedCount: movedBoxes.length },
          });
        }
      }

      res.json({ moved: movedBoxes.length, boxes: movedBoxes });
    } catch (e: any) {
      console.error("Move boxes error:", e);
      res.status(500).json({ message: e.message || "Internal error" });
    }
  });

  app.get(api.boxes.stats.path, async (req, res) => {
      const stats = await storage.getBoxStats();
      res.json(stats);
  });

  app.get(api.boxes.shippedReport.path, async (req, res) => {
    try {
      const { startDate, endDate } = api.boxes.shippedReport.input.parse(req.query);
      const report = await storage.getShippedBoxesReport(new Date(startDate), new Date(endDate));
      res.json(report);
    } catch (e) {
      res.status(400).json({ message: "Invalid dates" });
    }
  });

  // === MATERIALS ===
  app.get(api.materials.list.path, async (req, res) => {
      const mats = await storage.getMaterials();
      res.json(mats);
  });
  
  app.post(api.materials.create.path, async (req, res) => {
      try {
          const input = api.materials.create.input.parse(req.body);
          const mat = await storage.createMaterial(input);
          res.status(201).json(mat);
      } catch (e) {
          res.status(400).json({ message: "Invalid input" });
      }
  });

  // === LOCATIONS ===
  app.get(api.locations.list.path, async (req, res) => {
      const locs = await storage.getLocations();
      res.json(locs);
  });

  app.get(api.locations.getByQr.path, async (req, res) => {
      const loc = await storage.getLocationByQr(req.params.uuid);
      if (!loc) return res.status(404).json({ message: "Location not found" });
      res.json(loc);
  });

  app.post(api.locations.create.path, async (req, res) => {
      try {
        const input = api.locations.create.input.parse(req.body);
        const loc = await storage.createLocation(input);
        res.status(201).json(loc);
      } catch(e) {
        res.status(400).json({ message: "Invalid input" });
      }
  });

  // === AUDIT ===
  app.get(api.audit.list.path, async (req, res) => {
      const logs = await storage.getAuditLogs();
      res.json(logs);
  });

  app.patch(api.orders.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;
      
      // If we are resetting status to active, also clear completedAt
      if (data.status === 'active') {
        data.completedAt = null;
      }
      
      const order = await storage.updateOrder(id, data);
      
      // Audit
      // @ts-ignore
      if (req.session.userId) {
        // @ts-ignore
        const user = await storage.getUser(req.session.userId);
        await storage.createAuditLog({
            userId: user!.id,
            userName: user!.name,
            actionType: 'update',
            entityType: 'order',
            entityId: String(order.id),
            details: data
        });
      }

      res.json(order);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid input" });
    }
  });

  app.patch(api.orders.complete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.updateOrder(id, { 
        status: 'completed',
        completedAt: new Date()
      });
      
      // Audit
      // @ts-ignore
      if (req.session.userId) {
        // @ts-ignore
        const user = await storage.getUser(req.session.userId);
        await storage.createAuditLog({
            userId: user!.id,
            userName: user!.name,
            actionType: 'update',
            entityType: 'order',
            entityId: String(order.id),
            details: { status: 'completed' }
        });
      }

      res.json(order);
    } catch (e) {
      res.status(404).json({ message: "Order not found" });
    }
  });

  app.patch("/api/boxes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = insertBoxSchema.partial().parse(req.body);
      const box = await storage.updateBox(id, input);
      
      // Audit
      // @ts-ignore
      if (req.session.userId) {
        // @ts-ignore
        const user = await storage.getUser(req.session.userId);
        await storage.createAuditLog({
            userId: user!.id,
            userName: user!.name,
            actionType: 'update',
            entityType: 'box',
            entityId: String(box.id),
            details: { updates: input }
        });
      }

      res.json(box);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.patch(api.boxes.ship.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const box = await storage.updateBox(id, { 
        status: 'shipped',
        shippedAt: new Date(),
        // @ts-ignore
        shippedBy: req.session.userId || 1
      });
      
      // Audit
      // @ts-ignore
      if (req.session.userId) {
        // @ts-ignore
        const user = await storage.getUser(req.session.userId);
        await storage.createAuditLog({
            userId: user!.id,
            userName: user!.name,
            actionType: 'ship',
            entityType: 'box',
            entityId: String(box.id),
            details: { status: 'shipped' }
        });
      }

      res.json(box);
    } catch (e) {
      res.status(404).json({ message: "Box not found" });
    }
  });

  app.patch(api.materials.issue.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      const mat = await storage.updateMaterial(id, { 
        status: 'issued',
        issuedAt: new Date(),
        issuedReason: reason
      });
      res.json(mat);
    } catch (e) {
      res.status(404).json({ message: "Material not found" });
    }
  });

  app.get(api.settings.get.path, async (req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.post(api.settings.update.path, async (req, res) => {
    const s = await storage.updateSettings(req.body);
    res.json(s);
  });

  return httpServer;
}

async function seedDatabase() {
  const existingLocs = await storage.getLocations();
  let locs = existingLocs;
  if (existingLocs.length === 0) {
    const l1 = await storage.createLocation({ name: 'Стеллаж А, Полка 1', qrUuid: 'loc-a1', isActive: true });
    const l2 = await storage.createLocation({ name: 'Стеллаж А, Полка 2', qrUuid: 'loc-a2', isActive: true });
    const l3 = await storage.createLocation({ name: 'Зона загрузки', qrUuid: 'loc-dock', isActive: true });
    locs = [l1, l2, l3];
    console.log('Seeded locations');
  }

  const existingOrders = await storage.getOrders();
  // FORCE RE-SEEDING OF BOXES IF THEY ARE MISSING
  const existingBoxes = await storage.getBoxes();
  
  if (existingOrders.length === 0 || existingBoxes.length === 0) {
    // Clear potentially partial data to avoid unique constraint violations on orders
    if (existingOrders.length > 0) {
       // We can't easily delete via storage without more methods, 
       // but we can try to find the orders or just proceed if number is unique
    }

    let o1, o2, o3;
    
    const findOrCreateOrder = async (num: string, cust: string) => {
      const existing = await storage.getOrders('active', num);
      const match = existing.find(o => o.number === num);
      if (match) return match;
      return await storage.createOrder({ number: num, customer: cust, status: 'active' });
    };

    o1 = await findOrCreateOrder('ORD-1001', 'Acme Corp');
    o2 = await findOrCreateOrder('ORD-1002', 'Globex');
    o3 = await findOrCreateOrder('ORD-1003', 'Cyberdyne');
    
    console.log('Orders ready for boxes');

    if (existingBoxes.length === 0) {
      const placeholderImages = [
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1549194382-346a85f0adec?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=800"
      ];
      const stickerImages = [
        "https://images.unsplash.com/photo-1621341103006-8c01476100ba?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&q=80&w=800"
      ];

      // Add mock boxes for testing shipping
      await storage.createBox({
        orderId: o1.id,
        manualOrderNumber: o1.number,
        numberInOrder: '1/3',
        quantity: 500,
        locationType: 'permanent',
        locationId: locs[0].id,
        status: 'in_stock',
        productPhotos: [placeholderImages[0]],
        stickerPhoto: stickerImages[0],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });

      await storage.createBox({
        orderId: o1.id,
        manualOrderNumber: o1.number,
        numberInOrder: '2/3',
        quantity: 300,
        locationType: 'permanent',
        locationId: locs[1].id,
        status: 'in_stock',
        productPhotos: [placeholderImages[1]],
        stickerPhoto: stickerImages[1],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });

      await storage.createBox({
        orderId: o1.id,
        manualOrderNumber: o1.number,
        numberInOrder: '3/3',
        quantity: 200,
        locationType: 'temporary',
        tempLocationDesc: 'Near exit',
        status: 'in_stock',
        productPhotos: [placeholderImages[2]],
        stickerPhoto: stickerImages[0],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });

      await storage.createBox({
        orderId: o2.id,
        manualOrderNumber: o2.number,
        numberInOrder: '1/10',
        quantity: 1000,
        locationType: 'permanent',
        locationId: locs[0].id,
        status: 'in_stock',
        productPhotos: [placeholderImages[0]],
        stickerPhoto: stickerImages[1],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });

      await storage.createBox({
        orderId: o2.id,
        manualOrderNumber: o2.number,
        numberInOrder: '2/10',
        quantity: 1200,
        locationType: 'permanent',
        locationId: locs[1].id,
        status: 'in_stock',
        productPhotos: [placeholderImages[1]],
        stickerPhoto: stickerImages[0],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });

      await storage.createBox({
        orderId: o3.id,
        manualOrderNumber: o3.number,
        numberInOrder: '1/1',
        quantity: 50,
        locationType: 'permanent',
        locationId: locs[2].id,
        status: 'in_stock',
        productPhotos: [placeholderImages[2]],
        stickerPhoto: stickerImages[1],
        problemType: null,
        problemDesc: null,
        createdBy: 1,
        shippedBy: null
      });
      console.log('Seeded mock boxes');
    }
  }
}
