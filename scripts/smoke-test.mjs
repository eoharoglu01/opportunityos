const base = process.env.APP_URL ?? "http://localhost:3000";
const paths = ["/", "/api/health", "/api/version"];
let failed = false;
for (const path of paths) {
  try { const response = await fetch(`${base}${path}`, { redirect: "manual" }); console.log(`${response.status} ${path}`); if (response.status >= 500) failed = true; }
  catch (error) { failed = true; console.error(`${path}:`, error instanceof Error ? error.message : error); }
}
if (failed) process.exit(1);
