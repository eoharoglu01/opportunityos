import { randomBytes } from "node:crypto";
console.log(`CRON_SECRET=${randomBytes(32).toString("base64url")}`);
console.log(`ADMIN_API_SECRET=${randomBytes(32).toString("base64url")}`);
