import { initializeDatabase, getDatabase } from "../lib/store";

await initializeDatabase();
getDatabase().close();
console.info("SQLite store initialized.");
