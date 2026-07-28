import { readFileSync, existsSync } from "node:fs";
const requiredFiles = ["vercel.json", ".env.production.example", "app/api/health/route.ts", "app/api/readiness/route.ts", "supabase/migrations/006_production_hardening.sql"];
const missingFiles = requiredFiles.filter((file) => !existsSync(file));
const envExample = readFileSync(".env.production.example", "utf8");
const forbidden = ["SUPABASE_SERVICE_ROLE_KEY=ey", "CRON_SECRET=ey"];
const leaks = forbidden.filter((value) => envExample.includes(value));
if (missingFiles.length || leaks.length) { console.error({ missingFiles, leaks }); process.exit(1); }
console.log("Production dosya ve gizli bilgi denetimi başarılı.");
