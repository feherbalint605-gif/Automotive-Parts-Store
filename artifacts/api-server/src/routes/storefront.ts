import { createHmac, timingSafeEqual } from "node:crypto";
import {
  Router,
  type IRouter,
  type Request,
  type RequestHandler,
} from "express";
import bcrypt from "bcryptjs";
import {
  AdminAuth,
  AdminLoginBody,
  CreateAdminProductBody,
  CreateAdminProductResponse,
  CreateMessageBody,
  CreateMessageResponse,
  CreateOrderBody,
  CreateOrderResponse,
  DeleteAdminProductParams,
  AdminLoginResponse,
  GetAdminDashboardResponse,
  GetAdminSessionResponse,
  GetSiteContentResponse,
  ListAdminMessagesResponse,
  ListAdminOrdersResponse,
  ListAdminProductsResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  UpdateAdminOrderResponse,
  UpdateSiteContentBody,
  UpdateSiteContentResponse,
  UpdateAdminProductBody,
  UpdateAdminProductParams,
  UpdateAdminProductResponse,
  type Product,
} from "@workspace/api-zod";
import { getDatabase, type SQLiteStore } from "../lib/store";

const router: IRouter = Router();
const COOKIE_NAME = "store_admin";
const SESSION_SECONDS = 8 * 60 * 60;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function db(): SQLiteStore {
  return getDatabase();
}

function toProduct(row: Record<string, unknown>): Product {
  return {
    id: Number(row.id),
    category: String(row.category) as Product["category"],
    title: String(row.title),
    description: String(row.description),
    price: Number(row.price),
    imageUrl: String(row.image_url),
    active: Boolean(row.active),
    createdAt: new Date(String(row.created_at)),
  };
}

function toSiteContent(row: Record<string, unknown>) {
  return {
    heroTitle: String(row.hero_title),
    heroSubtitle: String(row.hero_subtitle),
    heroImageUrl: String(row.hero_image_url),
    aboutTitle: String(row.about_title),
    aboutBody: String(row.about_body),
    contactEmail: String(row.contact_email),
    contactPhone: String(row.contact_phone),
    instagramUrl: String(row.instagram_url),
    facebookUrl: String(row.facebook_url),
    sections: JSON.parse(String(row.sections_json ?? "[]")),
  };
}

type OrderItem = {
  productId: number;
  title: string;
  quantity: number;
  unitPrice: number;
};

function toOrder(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    customerName: String(row.customer_name),
    address: String(row.address),
    email: String(row.email),
    phone: String(row.phone),
    paymentMethod: String(row.payment_method) as
      | "cash_on_delivery"
      | "bank_transfer",
    items: JSON.parse(String(row.items_json)) as OrderItem[],
    total: Number(row.total),
    status: String(row.status) as "pending" | "shipped" | "cancelled",
    createdAt: new Date(String(row.created_at)),
  };
}

function toMessage(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    kind: String(row.kind) as "contact" | "print_request",
    name: String(row.name),
    email: String(row.email),
    details: String(row.details),
    fileName: row.file_name == null ? null : String(row.file_name),
    createdAt: new Date(String(row.created_at)),
  };
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for admin sessions");
  return secret;
}

function signature(expiresAt: string): string {
  return createHmac("sha256", sessionSecret())
    .update(`admin:${expiresAt}`)
    .digest("base64url");
}

function sessionToken(): string {
  const expiresAt = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expiresAt}.${signature(expiresAt)}`;
}

function isAdminRequest(req: Request): boolean {
  const cookieHeader = req.headers.cookie ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const separator = token.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Date.now()) return false;

  const expected = signature(expiresAt);
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return (
    suppliedBytes.length === expectedBytes.length &&
    timingSafeEqual(suppliedBytes, expectedBytes)
  );
}

const requireAdmin: RequestHandler = (req, res, next) => {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Admin sign-in required" });
    return;
  }
  next();
};

function setAdminCookie(res: Parameters<RequestHandler>[1], token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/api; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`,
  );
}

router.get("/products", (req, res): void => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const products = parsed.data.category
    ? db()
        .prepare(
          "SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY id",
        )
        .all(parsed.data.category)
    : db()
        .prepare("SELECT * FROM products WHERE active = 1 ORDER BY id")
        .all();
  res.json(ListProductsResponse.parse(products.map(toProduct)));
});

router.post("/orders", (req, res): void => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const order = db()
      .transaction(() => {
        const items: OrderItem[] = [];
        for (const item of parsed.data.items) {
          const product = db()
            .prepare("SELECT id, title, price FROM products WHERE id = ? AND active = 1")
            .get(item.productId);
          if (!product) throw new Error(`Product ${item.productId} is unavailable`);
          items.push({
            productId: Number(product.id),
            title: String(product.title),
            quantity: item.quantity,
            unitPrice: Number(product.price),
          });
        }

        const total =
          Math.round(
            items.reduce(
              (sum, item) => sum + item.unitPrice * item.quantity,
              0,
            ) * 100,
          ) / 100;
        const inserted = db()
          .prepare(
            `INSERT INTO orders
             (customer_name, address, email, phone, payment_method, items_json, total)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            parsed.data.customerName,
            parsed.data.address,
            parsed.data.email,
            parsed.data.phone,
            parsed.data.paymentMethod,
            JSON.stringify(items),
            total,
          );
        const row = db()
          .prepare("SELECT * FROM orders WHERE id = ?")
          .get(inserted.lastInsertRowid);
        if (!row) throw new Error("Order was not saved");
        return toOrder(row);
      })();

    res.status(201).json(CreateOrderResponse.parse(order));
  } catch (error) {
    req.log.warn({ err: error }, "Order could not be created");
    res.status(400).json({
      error:
        error instanceof Error ? error.message : "Order could not be created",
    });
  }
});

router.post("/messages", (req, res): void => {
  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const fileName = parsed.data.fileName ?? null;
  if (fileName && !/\.stl$/i.test(fileName)) {
    res.status(400).json({ error: "Only STL file names are accepted" });
    return;
  }

  const inserted = db()
    .prepare(
      `INSERT INTO messages (kind, name, email, details, file_name)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      parsed.data.kind,
      parsed.data.name,
      parsed.data.email,
      parsed.data.details,
      fileName,
    );
  const message = db()
    .prepare("SELECT * FROM messages WHERE id = ?")
    .get(inserted.lastInsertRowid);
  res.status(201).json(CreateMessageResponse.parse(toMessage(message!)));
});

router.get("/content", (_req, res): void => {
  const content = db().prepare("SELECT * FROM site_content WHERE id = 1").get();
  if (!content) {
    res.status(500).json({ error: "Site content is not initialized" });
    return;
  }
  res.json(GetSiteContentResponse.parse(toSiteContent(content)));
});

router.post("/admin/login", (req, res): void => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  if (attempts && attempts.resetAt > now && attempts.count >= 5) {
    res.status(429).json({ error: "Too many login attempts. Try again shortly." });
    return;
  }

  const user = db()
    .prepare("SELECT password_hash FROM admin_users WHERE username = ?")
    .get(parsed.data.username);
  const valid =
    Boolean(user) &&
    bcrypt.compareSync(parsed.data.password, String(user?.password_hash));
  if (!valid) {
    const next = attempts && attempts.resetAt > now
      ? { count: attempts.count + 1, resetAt: attempts.resetAt }
      : { count: 1, resetAt: now + 60_000 };
    loginAttempts.set(ip, next);
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  loginAttempts.delete(ip);
  setAdminCookie(res, sessionToken());
  res.json(AdminLoginResponse.parse({ authenticated: true }));
});

router.post("/admin/logout", (_req, res): void => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0${secure}`,
  );
  res.status(204).end();
});

router.get("/admin/session", (req, res): void => {
  res.json(GetAdminSessionResponse.parse({ authenticated: isAdminRequest(req) }));
});

router.get("/admin/dashboard", requireAdmin, (_req, res): void => {
  const totalOrders = Number(
    db().prepare("SELECT COUNT(*) AS count FROM orders").get()?.count ?? 0,
  );
  const totalMessages = Number(
    db().prepare("SELECT COUNT(*) AS count FROM messages").get()?.count ?? 0,
  );
  const activeProducts = Number(
    db()
      .prepare("SELECT COUNT(*) AS count FROM products WHERE active = 1")
      .get()?.count ?? 0,
  );
  const pendingOrders = Number(
    db()
      .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'")
      .get()?.count ?? 0,
  );
  res.json(
    GetAdminDashboardResponse.parse({
      totalOrders,
      totalMessages,
      activeProducts,
      pendingOrders,
    }),
  );
});

router.get("/admin/orders", requireAdmin, (_req, res): void => {
  const orders = db()
    .prepare("SELECT * FROM orders ORDER BY id DESC")
    .all()
    .map(toOrder);
  res.json(ListAdminOrdersResponse.parse(orders));
});

router.patch("/admin/orders/:id", requireAdmin, (req, res): void => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  const body = UpdateAdminOrderBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  db()
    .prepare("UPDATE orders SET status = ? WHERE id = ?")
    .run(body.data.status, params.data.id);
  const order = db()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(params.data.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(UpdateAdminOrderResponse.parse(toOrder(order)));
});

router.get("/admin/messages", requireAdmin, (_req, res): void => {
  const messages = db()
    .prepare("SELECT * FROM messages ORDER BY id DESC")
    .all()
    .map(toMessage);
  res.json(ListAdminMessagesResponse.parse(messages));
});

router.put("/admin/content", requireAdmin, (req, res): void => {
  const parsed = UpdateSiteContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const content = parsed.data;
  db()
    .prepare(
      `UPDATE site_content SET
       hero_title = ?, hero_subtitle = ?, hero_image_url = ?, about_title = ?,
       about_body = ?, contact_email = ?, contact_phone = ?, instagram_url = ?,
        facebook_url = ?, sections_json = ?, sections_initialized = 1
       WHERE id = 1`,
    )
    .run(
      content.heroTitle,
      content.heroSubtitle,
      content.heroImageUrl,
      content.aboutTitle,
      content.aboutBody,
      content.contactEmail,
      content.contactPhone,
      content.instagramUrl,
      content.facebookUrl,
      JSON.stringify(content.sections),
    );
  const updated = db().prepare("SELECT * FROM site_content WHERE id = 1").get();
  res.json(UpdateSiteContentResponse.parse(toSiteContent(updated!)));
});

router.get("/admin/products", requireAdmin, (_req, res): void => {
  const products = db()
    .prepare("SELECT * FROM products ORDER BY id")
    .all()
    .map(toProduct);
  res.json(ListAdminProductsResponse.parse(products));
});

router.post("/admin/products", requireAdmin, (req, res): void => {
  const parsed = CreateAdminProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const product = parsed.data;
  const inserted = db()
    .prepare(
      `INSERT INTO products (category, title, description, price, image_url, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      product.category,
      product.title,
      product.description,
      product.price,
      product.imageUrl,
      product.active ? 1 : 0,
    );
  const created = db()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(inserted.lastInsertRowid);
  res.status(201).json(CreateAdminProductResponse.parse(toProduct(created!)));
});

router.patch("/admin/products/:id", requireAdmin, (req, res): void => {
  const params = UpdateAdminProductParams.safeParse(req.params);
  const body = UpdateAdminProductBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const current = db()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(params.data.id);
  if (!current) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const currentProduct = toProduct(current);
  const updated = { ...currentProduct, ...body.data };
  db()
    .prepare(
      `UPDATE products SET category = ?, title = ?, description = ?, price = ?,
       image_url = ?, active = ? WHERE id = ?`,
    )
    .run(
      updated.category,
      updated.title,
      updated.description,
      updated.price,
      updated.imageUrl,
      updated.active ? 1 : 0,
      params.data.id,
    );
  const row = db()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(params.data.id);
  res.json(UpdateAdminProductResponse.parse(toProduct(row!)));
});

router.delete("/admin/products/:id", requireAdmin, (req, res): void => {
  const params = DeleteAdminProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = db()
    .prepare("DELETE FROM products WHERE id = ?")
    .run(params.data.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.status(204).end();
});

export default router;
