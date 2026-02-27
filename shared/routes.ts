import { z } from 'zod';
import { 
  insertUserSchema, insertLocationSchema, insertOrderSchema, 
  insertBoxSchema, insertMaterialSchema, insertSettingsSchema,
  users, locations, orders, boxes, materials, auditLogs, settings
} from './schema';

// Shared error schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === AUTH ===
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.null(),
      },
    },
  },

  // === ORDERS ===
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      input: z.object({
        status: z.enum(['active', 'completed']).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: insertOrderSchema,
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id' as const,
      responses: {
        200: z.custom<typeof orders.$inferSelect & { boxes: (typeof boxes.$inferSelect)[] }>(),
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/complete' as const,
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === BOXES ===
  boxes: {
    create: {
      method: 'POST' as const,
      path: '/api/boxes' as const,
      input: insertBoxSchema,
      responses: {
        201: z.custom<typeof boxes.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/boxes' as const,
      responses: {
        200: z.array(z.custom<typeof boxes.$inferSelect>()),
      },
    },
    ship: {
      method: 'PATCH' as const,
      path: '/api/boxes/:id/ship' as const,
      responses: {
        200: z.custom<typeof boxes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    stats: {
        method: 'GET' as const,
        path: '/api/boxes/stats' as const,
        responses: {
            200: z.object({
                totalInStock: z.number(),
                shippedToday: z.number(),
            })
        }
    },
    shippedReport: {
      method: 'GET' as const,
      path: '/api/boxes/reports/shipped' as const,
      input: z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
      responses: {
        200: z.array(z.custom<typeof boxes.$inferSelect & { orderNumber: string | null, customer: string | null }>()),
      },
    }
  },

  // === MATERIALS ===
  materials: {
    list: {
      method: 'GET' as const,
      path: '/api/materials' as const,
      input: z.object({
        search: z.string().optional(),
        type: z.enum(['raw', 'client_supplied', 'tool']).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof materials.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/materials' as const,
      input: insertMaterialSchema,
      responses: {
        201: z.custom<typeof materials.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    issue: {
      method: 'PATCH' as const,
      path: '/api/materials/:id/issue' as const,
      input: z.object({ reason: z.string() }),
      responses: {
        200: z.custom<typeof materials.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === LOCATIONS ===
  locations: {
    list: {
      method: 'GET' as const,
      path: '/api/locations' as const,
      responses: {
        200: z.array(z.custom<typeof locations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/locations' as const,
      input: insertLocationSchema,
      responses: {
        201: z.custom<typeof locations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getByQr: {
      method: 'GET' as const,
      path: '/api/locations/qr/:uuid' as const,
      responses: {
        200: z.custom<typeof locations.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === AUDIT ===
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit' as const,
      responses: {
        200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
      },
    },
  },
  
  // === SETTINGS ===
  settings: {
      get: {
          method: 'GET' as const,
          path: '/api/settings' as const,
          responses: {
              200: z.custom<typeof settings.$inferSelect>(),
          }
      },
      update: {
          method: 'POST' as const,
          path: '/api/settings' as const,
          input: insertSettingsSchema.partial(),
          responses: {
              200: z.custom<typeof settings.$inferSelect>(),
          }
      }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
