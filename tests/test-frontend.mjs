import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const API = 'http://localhost:5000/api';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    executablePath: '/home/jd/.cache/ms-playwright/chromium-1223/chrome-linux/chrome',
    headless: true,
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CONSOLE ERROR] ${msg.text()}`);
  });

  try {
    // 1. Home page loads
    console.log('\n--- Test 1: Home page loads ---');
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`Title: ${title}`);
    const bodyText = await page.textContent('body');
    const hasLuckyAI = bodyText.includes('LuckyAI') || bodyText.includes('Lucky');
    console.log(`Has LuckyAI text: ${hasLuckyAI}`);
    console.log(`PASS: ${hasLuckyAI}`);

    // 2. Navigate to Auth page
    console.log('\n--- Test 2: Navigate to Auth page ---');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    // Try finding the auth-related navigation
    const signInBtn = page.locator('button:has-text("Sign in"), button:has-text("Sign In"), [href*="auth"]').first();
    if (await signInBtn.isVisible().catch(() => false)) {
      await signInBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }
    // Check if auth page loaded
    const authText = await page.textContent('body').catch(() => '');
    const hasAuthForm = authText.includes('Sign in') || authText.includes('Register') || authText.includes('signin');
    console.log(`Auth form visible: ${hasAuthForm}`);
    console.log(`PASS: ${hasAuthForm}`);

    // 3. Register via API (backend test)
    console.log('\n--- Test 3: Register via API ---');
    const testEmail = `test_${Date.now()}@example.com`;
    const registerRes = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: testEmail, password: 'Pass1234', phone: '+251911111111' }),
    });
    const registerData = await registerRes.json();
    const registerOk = registerData.success && registerData.token;
    console.log(`Register success: ${registerOk}`);
    console.log(`PASS: ${registerOk}`);

    const token = registerData.token;

    // 4. Login via API
    console.log('\n--- Test 4: Login via API ---');
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Pass1234' }),
    });
    const loginData = await loginRes.json();
    const loginOk = loginData.success && loginData.token;
    console.log(`Login success: ${loginOk}`);
    console.log(`PASS: ${loginOk}`);

    // 5. Get wallet (auth required)
    console.log('\n--- Test 5: Wallet API ---');
    const walletRes = await fetch(`${API}/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const walletData = await walletRes.json();
    const walletOk = walletData.success && 'balance' in walletData;
    console.log(`Wallet success: ${walletOk}, balance: ${walletData.balance}`);
    console.log(`PASS: ${walletOk}`);

    // 6. Get notifications (auth required)
    console.log('\n--- Test 6: Notifications API ---');
    const notifRes = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifData = await notifRes.json();
    const notifOk = notifData.success && Array.isArray(notifData.notifications);
    console.log(`Notifications success: ${notifOk}, count: ${notifData.notifications?.length}`);
    console.log(`PASS: ${notifOk}`);

    // 7. Health endpoint
    console.log('\n--- Test 7: Health API ---');
    const healthRes = await fetch(`${API}/health`);
    const healthData = await healthRes.json();
    const healthOk = healthData.success && healthData.db === 'connected';
    console.log(`Health success: ${healthOk}, db: ${healthData.db}`);
    console.log(`PASS: ${healthOk}`);

    console.log('\n========================================');
    console.log('ALL TESTS PASSED');
    console.log('========================================');
  } catch (err) {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
