import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import bcrypt from "bcryptjs";
import initSqlJs, { type Database as SqlDatabase, type SqlValue } from "sql.js";

type SqlRow = Record<string, unknown>;
type RunResult = { changes: number; lastInsertRowid: number };
type SeedTextBox = { id: string; title: string; bodyText: string };
type SeedFeature = { id: string; title: string; bodyText: string };
type SeedSectionContent = {
  title: string;
  subtitle: string;
  bodyText: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  formKind: "contact" | "print_request";
  textBoxes: SeedTextBox[];
  featureItems: SeedFeature[];
};
type SeedSection = {
  id: string;
  type: "hero" | "banner" | "text_image" | "features" | "custom_form";
  order: number;
  layout: "image_left" | "image_right" | "centered";
  content: SeedSectionContent;
};

function defaultHomepageSections(siteContent: SqlRow): SeedSection[] {
  const makeContent = (
    values: Partial<SeedSectionContent> = {},
  ): SeedSectionContent => ({
    title: "",
    subtitle: "",
    bodyText: "",
    imageUrl: "",
    buttonText: "",
    buttonUrl: "",
    formKind: "print_request",
    textBoxes: [],
    featureItems: [],
    ...values,
  });

  return [
    {
      id: "hero-main",
      type: "hero",
      order: 0,
      layout: "centered",
      content: makeContent({
        title: String(siteContent.hero_title),
        subtitle: String(siteContent.hero_subtitle),
        imageUrl: String(siteContent.hero_image_url),
        buttonText: "Shop the parts",
        buttonUrl: "#shop",
      }),
    },
    {
      id: "banner-bench-notes",
      type: "banner",
      order: 1,
      layout: "centered",
      content: makeContent({
        title: "No mystery parts.",
        subtitle: "Bench notes / 001",
        bodyText:
          "We make, test, and ship the things we wanted for our own cars. Clear fitment notes, honest materials, and a human on the other end if something isn’t right.",
        buttonText: "Meet the workshop",
        buttonUrl: "#block-story-workshop",
      }),
    },
    {
      id: "custom-print-request",
      type: "custom_form",
      order: 2,
      layout: "image_right",
      content: makeContent({
        title: "Custom print request",
        subtitle: "02 / Made for your build",
        bodyText:
          "Send us a sketch, a reference, or the part you’ve been trying to replace. We’ll look at the shape, material, and whether a print is the right fix before we quote it.",
        formKind: "print_request",
      }),
    },
    {
      id: "story-workshop",
      type: "text_image",
      order: 3,
      layout: "image_right",
      content: makeContent({
        title: String(siteContent.about_title),
        bodyText: String(siteContent.about_body),
        imageUrl: "/workshop-hero.png",
      }),
    },
    {
      id: "features-workshop",
      type: "features",
      order: 4,
      layout: "centered",
      content: makeContent({
        title: "Small details. Serious builds.",
        subtitle: "03 / A small workshop",
        bodyText:
          "Considered parts for people who care how their car is put together.",
        featureItems: [
          {
            id: "feature-tested",
            title: "Real-world tested",
            bodyText: "Parts are tried on real builds before they reach the shelf.",
          },
          {
            id: "feature-small-runs",
            title: "Small-run friendly",
            bodyText: "Made in considered batches, with fit and finish in mind.",
          },
          {
            id: "feature-workshop",
            title: "Made by the workshop",
            bodyText: "Packed by the people who made and tested each part.",
          },
        ],
      }),
    },
    {
      id: "contact-workshop",
      type: "custom_form",
      order: 5,
      layout: "centered",
      content: makeContent({
        title: "Real people. Real replies.",
        subtitle: "04 / Drop us a line",
        bodyText:
          "Need a fitment check or have a question before ordering? Tell us what you’re working on.",
        formKind: "contact",
      }),
    },
  ];
}

const moduleRequire = createRequire(import.meta.url);
const databasePath = resolve(
  process.env.SQLITE_DB_PATH ?? resolve(process.cwd(), "data/store.sqlite"),
);
let rawDatabase: SqlDatabase | undefined;
let store: SQLiteStore | undefined;

export class SQLiteStore {
  constructor(private readonly raw: SqlDatabase) {}

  exec(sql: string): void {
    this.raw.run(sql);
    this.persist();
  }

  prepare(sql: string) {
    return {
      get: (...params: unknown[]): SqlRow | undefined => {
        const statement = this.raw.prepare(sql);
        try {
          if (params.length > 0) statement.bind(params as SqlValue[]);
          if (!statement.step()) return undefined;
          return statement.getAsObject() as SqlRow;
        } finally {
          statement.free();
        }
      },
      all: (...params: unknown[]): SqlRow[] => {
        const statement = this.raw.prepare(sql);
        try {
          if (params.length > 0) statement.bind(params as SqlValue[]);
          const rows: SqlRow[] = [];
          while (statement.step()) {
            rows.push(statement.getAsObject() as SqlRow);
          }
          return rows;
        } finally {
          statement.free();
        }
      },
      run: (...params: unknown[]): RunResult => {
        this.raw.run(sql, params as SqlValue[]);
        const changes = this.raw.getRowsModified();
        const idRows = this.raw.exec("SELECT last_insert_rowid() AS id");
        const lastInsertRowid = Number(idRows[0]?.values[0]?.[0] ?? 0);
        this.persist();
        return { changes, lastInsertRowid };
      },
    };
  }

  transaction<T>(work: () => T): () => T {
    return () => {
      this.raw.run("BEGIN IMMEDIATE");
      this.transactionDepth += 1;
      try {
        const result = work();
        this.raw.run("COMMIT");
        this.transactionDepth -= 1;
        this.persist();
        return result;
      } catch (error) {
        this.raw.run("ROLLBACK");
        this.transactionDepth -= 1;
        throw error;
      }
    };
  }

  close(): void {
    this.persist();
    this.raw.close();
  }

  private transactionDepth = 0;

  private persist(): void {
    if (this.transactionDepth > 0 || !rawDatabase) return;
    const bytes = Buffer.from(this.raw.export());
    mkdirSync(dirname(databasePath), { recursive: true });
    const temporaryPath = `${databasePath}.tmp`;
    writeFileSync(temporaryPath, bytes);
    renameSync(temporaryPath, databasePath);
  }
}

export function getDatabase(): SQLiteStore {
  if (!store) throw new Error("SQLite database has not been initialized");
  return store;
}

export async function initializeDatabase(): Promise<void> {
  if (store) return;

  mkdirSync(dirname(databasePath), { recursive: true });
  const locateFile = (file: string): string =>
    resolve(dirname(moduleRequire.resolve("sql.js")), file);
  const SQL = await initSqlJs({ locateFile });
  const existingBytes = existsSync(databasePath)
    ? readFileSync(databasePath)
    : Buffer.alloc(0);
  rawDatabase = new SQL.Database(
    existingBytes.length > 0 ? new Uint8Array(existingBytes) : undefined,
  );
  store = new SQLiteStore(rawDatabase);

  store.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK (category IN ('magnetic_license_plates', 'carbon_fiber_parts', 'custom_3d_printing')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      image_url TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash_on_delivery', 'bank_transfer')),
      items_json TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL CHECK (kind IN ('contact', 'print_request')),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      details TEXT NOT NULL,
      file_name TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT NOT NULL,
      hero_image_url TEXT NOT NULL,
      about_title TEXT NOT NULL,
      about_body TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      instagram_url TEXT NOT NULL,
      facebook_url TEXT NOT NULL,
      sections_json TEXT NOT NULL DEFAULT '[]',
      sections_initialized INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS admin_users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL
    );
  `);

  const siteContentColumns = store
    .prepare("PRAGMA table_info(site_content)")
    .all()
    .map((column) => String(column.name));
  if (!siteContentColumns.includes("sections_json")) {
    store.exec(
      "ALTER TABLE site_content ADD COLUMN sections_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!siteContentColumns.includes("sections_initialized")) {
    store.exec(
      "ALTER TABLE site_content ADD COLUMN sections_initialized INTEGER NOT NULL DEFAULT 0",
    );
  }

  store
    .prepare(
      `INSERT OR IGNORE INTO site_content
       (id, hero_title, hero_subtitle, hero_image_url, about_title, about_body,
        contact_email, contact_phone, instagram_url, facebook_url)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "Built for the road less ordinary.",
      "Thoughtful automotive details, carbon-fiber upgrades, and custom 3D prints—made for your build.",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=85",
      "Small details. Serious builds.",
      "We make considered parts for people who care how their car is put together. From clean magnetic plate mounts to custom-printed parts, every order starts with fit, function, and a little more character.",
      "hello@forgeauto.hu",
      "+36 30 555 0100",
      "https://www.instagram.com/",
      "https://www.facebook.com/",
    );

  const existingSiteContent = store
    .prepare("SELECT * FROM site_content WHERE id = 1")
    .get();
  if (!existingSiteContent) {
    throw new Error("Site content could not be initialized");
  }
  if (Number(existingSiteContent.sections_initialized) === 0) {
    store
      .prepare(
        "UPDATE site_content SET sections_json = ?, sections_initialized = 1 WHERE id = 1",
      )
      .run(JSON.stringify(defaultHomepageSections(existingSiteContent)));
  }

  const configuredAdminUsername = process.env.ADMIN_USERNAME?.trim() || "admin";
  const configuredAdminPassword = process.env.ADMIN_PASSWORD;
  const adminUsers = store
    .prepare("SELECT username, password_hash FROM admin_users ORDER BY username")
    .all();
  const adminUser =
    adminUsers.find((user) => user.username === configuredAdminUsername) ??
    adminUsers.find((user) => user.username === "admin") ??
    adminUsers[0];

  if (!adminUser) {
    store
      .prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)")
      .run(
        configuredAdminUsername,
        bcrypt.hashSync(configuredAdminPassword ?? "adminpass123", 12),
      );
  } else {
    const existingUsername = String(adminUser.username);
    const existingPasswordHash = String(adminUser.password_hash);
    const passwordHash =
      configuredAdminPassword &&
      !bcrypt.compareSync(configuredAdminPassword, existingPasswordHash)
        ? bcrypt.hashSync(configuredAdminPassword, 12)
        : existingPasswordHash;

    if (
      existingUsername !== configuredAdminUsername ||
      passwordHash !== existingPasswordHash
    ) {
      store
        .prepare(
          "UPDATE admin_users SET username = ?, password_hash = ? WHERE username = ?",
        )
        .run(configuredAdminUsername, passwordHash, existingUsername);
    }
  }

  const productCount = Number(
    store.prepare("SELECT COUNT(*) AS count FROM products").get()?.count ?? 0,
  );
  if (productCount === 0) {
    const seedProducts = [
      {
        category: "magnetic_license_plates",
        title: "Magnetic Plate Frame",
        description: "A clean, secure magnetic mount that keeps the original plate hardware out of sight.",
        price: 14900,
        imageUrl:
          "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=85",
      },
      {
        category: "carbon_fiber_parts",
        title: "Carbon Fiber Trim Set",
        description: "Lightweight carbon-fiber details with a precise fit and a deep satin finish.",
        price: 32900,
        imageUrl:
          "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85",
      },
      {
        category: "custom_3d_printing",
        title: "Custom 3D Printed Part",
        description: "A made-to-order print for your car, interior, workshop, or one-off project.",
        price: 8900,
        imageUrl:
          "/3d-printed-part.svg",
      },
    ];
    const insertProduct = store.prepare(
      `INSERT INTO products (category, title, description, price, image_url, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
    );
    store.transaction(() => {
      for (const product of seedProducts) {
        insertProduct.run(
          product.category,
          product.title,
          product.description,
          product.price,
          product.imageUrl,
        );
      }
    })();
  }
}
