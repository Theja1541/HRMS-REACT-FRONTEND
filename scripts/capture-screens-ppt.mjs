import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import PptxGenJS from 'pptxgenjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_FILE = path.join(ROOT_DIR, 'src', 'App.jsx');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output', 'screens-ppt');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');
const BASE_URL = process.env.HRMS_BASE_URL || 'http://localhost:5173';
const LOGIN_EMAIL = process.env.HRMS_LOGIN_EMAIL || '';
const LOGIN_PASSWORD = process.env.HRMS_LOGIN_PASSWORD || '';
const LOGIN_TENANT_SLUG = process.env.HRMS_LOGIN_TENANT_SLUG || '';

const DYNAMIC_SEGMENT_DEFAULTS = {
  tenantSlug: 'demo',
  id: '1',
};

function sanitizeFileName(input) {
  return input
    .replace(/^\/+/, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^$/, 'root');
}

function routeToImageName(index, routePath) {
  const indexPart = String(index + 1).padStart(3, '0');
  const routePart = sanitizeFileName(routePath);
  return `${indexPart}_${routePart}.png`;
}

function toAbsoluteRoutePath(routePath) {
  if (!routePath || routePath === '*' || routePath === '/') return null;
  if (routePath.startsWith('/')) return routePath;
  return `/${routePath}`;
}

function resolveDynamicSegments(routePath) {
  return routePath.replace(/:([a-zA-Z0-9_]+)/g, (_, segmentName) => {
    return DYNAMIC_SEGMENT_DEFAULTS[segmentName] || '1';
  });
}

function extractRoutes(appContent) {
  const routePattern = /<Route\s+[^>]*path="([^"]+)"/g;
  const routes = [];
  const seen = new Set();
  let match = routePattern.exec(appContent);

  while (match) {
    const rawPath = match[1];
    const absolutePath = toAbsoluteRoutePath(rawPath);
    if (absolutePath && !seen.has(absolutePath)) {
      seen.add(absolutePath);
      routes.push(resolveDynamicSegments(absolutePath));
    }
    match = routePattern.exec(appContent);
  }

  return routes;
}

async function prepareDirs() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
}

async function buildPresentation(screenshotEntries) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'HRMS Automation';
  pptx.company = 'HRMS';
  pptx.subject = 'HRMS application screens';
  pptx.title = 'HRMS - Application Screens';

  for (const entry of screenshotEntries) {
    const slide = pptx.addSlide();
    slide.addText(entry.routePath, {
      x: 0.2,
      y: 0.1,
      w: 12.8,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: '1F2937',
    });
    slide.addImage({
      path: entry.imagePath,
      x: 0.15,
      y: 0.5,
      w: 13.0,
      h: 6.9,
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPptPath = path.join(OUTPUT_DIR, `HRMS_Screens_${timestamp}.pptx`);
  await pptx.writeFile({ fileName: outputPptPath });
  return outputPptPath;
}

async function promptForLogin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    await rl.question(
      '\nLogin in the opened browser tab, then press Enter here to continue capturing screens...'
    );
  } finally {
    rl.close();
  }
}

async function runAutomatedLogin(page) {
  await page.fill('input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[name="password"]', LOGIN_PASSWORD);
  await page.fill('input[name="tenant_slug"]', LOGIN_TENANT_SLUG);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 45000,
  });
}

async function main() {
  await prepareDirs();
  const appContent = await fs.readFile(APP_FILE, 'utf8');
  const routes = extractRoutes(appContent);

  if (!routes.length) {
    throw new Error('No routes found in App.jsx');
  }

  console.log(`Found ${routes.length} routes in App.jsx`);
  console.log(`Base URL: ${BASE_URL}`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();

  const loginUrl = `${BASE_URL}/login`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  const hasAutomationCreds = Boolean(
    LOGIN_EMAIL.trim() && LOGIN_PASSWORD.trim() && LOGIN_TENANT_SLUG.trim()
  );

  if (hasAutomationCreds) {
    console.log('Attempting automated login with environment credentials...');
    try {
      await runAutomatedLogin(page);
      console.log('Automated login succeeded.');
    } catch (error) {
      console.log('Automated login failed. Please login manually in browser.');
      console.log(error.message);
      await promptForLogin();
    }
  } else {
    await promptForLogin();
  }

  const captured = [];
  const failed = [];

  for (let i = 0; i < routes.length; i += 1) {
    const routePath = routes[i];
    const targetUrl = `${BASE_URL}${routePath}`;
    const imageName = routeToImageName(i, routePath);
    const imagePath = path.join(SCREENSHOTS_DIR, imageName);

    process.stdout.write(`[${i + 1}/${routes.length}] ${routePath} ... `);
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: imagePath, fullPage: true });
      console.log('captured');
      captured.push({ routePath, imagePath });
    } catch (error) {
      console.log('failed');
      failed.push({ routePath, reason: error.message });
    }
  }

  const pptPath = await buildPresentation(captured);
  await browser.close();

  console.log('\nCapture complete.');
  console.log(`Captured: ${captured.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`PPT: ${pptPath}`);

  if (failed.length) {
    const failureLogPath = path.join(OUTPUT_DIR, 'failed-routes.json');
    await fs.writeFile(failureLogPath, JSON.stringify(failed, null, 2), 'utf8');
    console.log(`Failed route details: ${failureLogPath}`);
  }
}

main().catch((error) => {
  console.error('\nError while generating screens PPT');
  console.error(error);
  process.exit(1);
});
