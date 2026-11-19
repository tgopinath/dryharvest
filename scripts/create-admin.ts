/** Create or promote an admin:  npm run admin:create -- you@example.com "Your Name" */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

async function main() {
  const [email, name = 'Store Admin'] = process.argv.slice(2);
  if (!email) throw new Error('Usage: npm run admin:create -- email@example.com "Name"');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email.toLowerCase()) });
  if (existing) {
    await db.update(schema.users).set({ role: 'ADMIN', isActive: true }).where(eq(schema.users.id, existing.id));
    console.log(`✔ ${email} promoted to ADMIN`);
  } else {
    const pw = randomBytes(9).toString('base64url');
    await db.insert(schema.users).values({ email: email.toLowerCase(), name, role: 'ADMIN', passwordHash: await bcrypt.hash(pw, 12) });
    console.log(`✔ Admin created: ${email}\n  Temporary password: ${pw}\n  Change it from My Account after logging in.`);
  }
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
