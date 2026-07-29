import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const authDirectory = path.join(
  process.cwd(),
  ".auth",
);

const storageStatePath = path.join(
  authDirectory,
  "a101.json",
);

fs.mkdirSync(authDirectory, {
  recursive: true,
});

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
});

const page = await context.newPage();

await page.goto(
  "https://www.a101.com.tr/kapida/sut-urunleri-kahvaltilik/sut",
  {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  },
);

console.log(
  "\nAçılan pencerede teslimat konumunu seç.",
);

console.log(
  "Ürünler göründüğünde terminale dönüp Enter tuşuna bas.\n",
);

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

await new Promise((resolve) => {
  readlineInterface.question(
    "Konum seçildi ve ürünler göründü mü? ",
    resolve,
  );
});

readlineInterface.close();

await context.storageState({
  path: storageStatePath,
});

console.log(
  `A101 oturumu kaydedildi: ${storageStatePath}`,
);

await browser.close();