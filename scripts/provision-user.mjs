import { randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";

function readSecret(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal.");
  }
  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const previousRawMode = process.stdin.isRaw;
    const restore = () => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(previousRawMode ?? false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const byte of chunk) {
        if (byte === 3) {
          restore();
          reject(new Error("Cancelled."));
          return;
        }
        if (byte === 13 || byte === 10) {
          restore();
          resolve(value);
          return;
        }
        if (byte === 8 || byte === 127) value = value.slice(0, -1);
        else if (byte >= 32 && byte <= 126) value += String.fromCharCode(byte);
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

const email = String(process.argv[2] ?? "").trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Usage: npm run auth:provision -- user@company.com");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const password = await readSecret("New password (12+ ASCII characters): ");
if (password.length < 12) throw new Error("Password must contain at least 12 characters.");
if (!/^[\x20-\x7e]+$/.test(password)) throw new Error("Use printable ASCII characters for this account password.");
const confirmation = await readSecret("Confirm password: ");
if (password !== confirmation) throw new Error("Passwords do not match.");

const salt = randomBytes(16).toString("hex");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});
try {
  await pool.query(
    `INSERT INTO crm_users (email, password_hash, active, failed_login_attempts, locked_until)
     VALUES ($1, $2, TRUE, 0, NULL)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
       active = TRUE, failed_login_attempts = 0, locked_until = NULL`,
    [email, passwordHash],
  );
  console.log(`Password provisioned for ${email}.`);
} finally {
  await pool.end();
}