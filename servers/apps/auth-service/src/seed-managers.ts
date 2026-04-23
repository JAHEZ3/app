import "dotenv/config";
import { Client } from "pg";
import * as bcrypt from "bcrypt";

const managers = [
  {
    fullName: "Admin Manager",
    email: "admin@jahez.com",
    password: "Admin@1234",
  },
  {
    fullName: "Operations Manager",
    email: "manager@jahez.com",
    password: "Manager@1234",
  },
];

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "postgres",
    database: process.env.DB_NAME ?? "jahez_db",
  });

  await client.connect();
  console.log("Connected to database.\n");

  for (const m of managers) {
    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [m.email],
    );

    if (existing.rows.length > 0) {
      console.log(`-  Manager already exists: ${m.email}  -  skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(m.password, 10);

    await client.query(
      `INSERT INTO users
         (full_name, email, password_hash, role, status, profile_completed)
       VALUES
         ($1, $2, $3, 'manager', 'active', true)`,
      [m.fullName, m.email, passwordHash],
    );

    console.log(`+  Created manager: ${m.email}  /  password: ${m.password}`);
  }

  await client.end();
  console.log("\nDone.");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
