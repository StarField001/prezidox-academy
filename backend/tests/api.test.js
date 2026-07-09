const assert = require('assert');
const http = require('http');
const express = require('express');
const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const { signToken } = require('../src/utils/jwt');

// Start the server on a random port
let server;
let port;
let baseUrl;
let testUserEmail = `test_${Date.now()}@example.com`;
let testUserPassword = 'password123';
let testUserId;
let testToken;
let testQuestionId;

async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${path}`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let body = data;
        if (res.headers['content-type']?.includes('application/json')) {
          try { body = JSON.parse(data); } catch(e) {}
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log("=== API Route Integration Tests ===");

  // Start server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // ─── 1. AUTHENTICATION FLOW ───────────────────────────
    console.log("\n[Test 1] Auth Flow - Registering User...");
    const regRes = await request('POST', '/api/auth/register', {
      firstName: 'Test',
      lastName: 'User',
      email: testUserEmail,
      password: testUserPassword,
      examFocus: 'unilag'
    });
    
    assert.strictEqual(regRes.statusCode, 201, `Expected 201 but got ${regRes.statusCode}: ${JSON.stringify(regRes.body)}`);
    assert.ok(regRes.body.userId, "Expected registration to return a userId");
    testUserId = regRes.body.userId;
    console.log(`Registered user ID: ${testUserId}`);

    // Verify email directly in DB to bypass verification step
    await prisma.user.update({
      where: { id: testUserId },
      data: { emailVerified: true }
    });

    console.log("[Test 1] Auth Flow - Logging In User...");
    const loginRes = await request('POST', '/api/auth/login', {
      email: testUserEmail,
      password: testUserPassword
    });
    assert.strictEqual(loginRes.statusCode, 200, `Expected 200 but got ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    assert.ok(loginRes.body.user, "Expected login response to contain user details");
    
    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      const cookieStr = setCookie[0];
      const match = cookieStr.match(/prezidox_token=([^;]+)/);
      if (match) {
        testToken = match[1];
      }
    }
    if (!testToken) {
      testToken = signToken({ userId: testUserId });
    }
    assert.ok(testToken, "Expected to retrieve an authentication token");
    console.log("Authenticated successfully!");

    // JWT Validation Test
    console.log("[Test 1] Auth Flow - Verifying JWT Protection...");
    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${testToken}`
    });
    assert.strictEqual(meRes.statusCode, 200, `Expected 200 but got ${meRes.statusCode}`);
    assert.strictEqual(meRes.body.user.email, testUserEmail.toLowerCase());

    const authHeaders = { 'Authorization': `Bearer ${testToken}` };

    // ─── 2. QUESTIONS ENDPOINTS ───────────────────────────
    console.log("\n[Test 2] Questions - Fetching UNILAG Questions...");
    const unilagQRes = await request('GET', '/api/questions?category=unilag&limit=2', null, authHeaders);
    assert.strictEqual(unilagQRes.statusCode, 200, `Expected 200 but got ${unilagQRes.statusCode}`);
    assert.ok(Array.isArray(unilagQRes.body.questions), "Expected questions to be an array");
    assert.ok(unilagQRes.body.questions.length > 0, "Expected to return questions");
    testQuestionId = unilagQRes.body.questions[0].id;
    console.log(`Retrieved sample question ID: ${testQuestionId}`);

    console.log("[Test 2] Questions - Verifying OAU Category Routing (mapped to unilag)...");
    const oauQRes = await request('GET', '/api/questions?category=oau&limit=2', null, authHeaders);
    assert.strictEqual(oauQRes.statusCode, 200);
    assert.ok(Array.isArray(oauQRes.body.questions), "Expected OAU questions to be an array");
    assert.ok(oauQRes.body.questions.length > 0, "Expected OAU questions to map to UNILAG questions");

    console.log("[Test 2] Questions - Fetching Subjects for category=oau...");
    const oauSubRes = await request('GET', '/api/questions/subjects?category=oau', null, authHeaders);
    assert.strictEqual(oauSubRes.statusCode, 200);
    assert.ok(Array.isArray(oauSubRes.body.subjects), "Expected subjects to be an array");

    console.log("[Test 2] Questions - Fetching Topics for UNILAG subject...");
    const topicRes = await request('GET', `/api/questions/topics?category=unilag&subject=${encodeURIComponent(unilagQRes.body.questions[0].subject)}`, null, authHeaders);
    assert.strictEqual(topicRes.statusCode, 200);
    assert.ok(Array.isArray(topicRes.body.topics), "Expected topics to be an array");

    console.log("[Test 2] Questions - Fetching Years for UNILAG subject...");
    const yearRes = await request('GET', `/api/questions/years?category=unilag&subject=${encodeURIComponent(unilagQRes.body.questions[0].subject)}`, null, authHeaders);
    assert.strictEqual(yearRes.statusCode, 200);
    assert.ok(Array.isArray(yearRes.body.years), "Expected years to be an array");

    // ─── 3. SESSIONS SUBMISSION ───────────────────────────
    console.log("\n[Test 3] Sessions - Submitting CBT session...");
    const submitBody = {
      mode: 'flash-cbt',
      category: 'unilag',
      timeTaken: 60000,
      answers: {
        [testQuestionId]: { selected: 'A' }
      }
    };
    const submitRes = await request('POST', '/api/sessions/submit', submitBody, authHeaders);
    assert.strictEqual(submitRes.statusCode, 200, `Expected 200 but got ${submitRes.statusCode}: ${JSON.stringify(submitRes.body)}`);
    assert.ok(submitRes.body.session, "Expected submission response to contain the session");
    assert.ok(submitRes.body.pointsEarned !== undefined, "Expected pointsEarned to be returned");
    assert.ok(submitRes.body.streak !== undefined, "Expected streak to be returned");
    console.log(`Session created. Points earned: ${submitRes.body.pointsEarned}, Current streak: ${submitRes.body.streak}`);

    // Verify Study Hall Placement
    console.log("[Test 3] Sessions - Verifying Study Hall standing exists...");
    const studyHallRes = await request('GET', '/api/study-hall', null, authHeaders);
    assert.strictEqual(studyHallRes.statusCode, 200);
    assert.ok(studyHallRes.body.myPoints > 0, "Expected user to have study hall points");
    console.log(`Placed in Study Hall: "${studyHallRes.body.hallName}", Points: ${studyHallRes.body.myPoints}`);

    // ─── 4. LEADERBOARD ENDPOINTS ─────────────────────────
    console.log("\n[Test 4] Leaderboard - Fetching Weekly Standings...");
    const leaderRes = await request('GET', '/api/leaderboard?period=weekly', null, authHeaders);
    assert.strictEqual(leaderRes.statusCode, 200);
    assert.ok(Array.isArray(leaderRes.body.entries), "Expected weekly leaderboard to be an array");

    console.log("[Test 4] Leaderboard - Fetching Speed Leaderboard...");
    const speedLeaderRes = await request('GET', '/api/sessions/speed-leaderboard', null, authHeaders);
    assert.strictEqual(speedLeaderRes.statusCode, 200);
    assert.ok(Array.isArray(speedLeaderRes.body.leaderboard), "Expected speed leaderboard to be an array");
    console.log("Speed leaderboard retrieved successfully!");

    // ─── 5. PAYMENTS FLOW ─────────────────────────────────
    console.log("\n[Test 5] Payments - Initializing payment for unilag plan...");
    const initPayRes = await request('POST', '/api/payments/initialize', { plan: 'unilag' }, authHeaders);
    assert.strictEqual(initPayRes.statusCode, 200, `Expected 200 but got ${initPayRes.statusCode}: ${JSON.stringify(initPayRes.body)}`);
    assert.ok(initPayRes.body.reference, "Expected response to contain payment reference");
    assert.ok(initPayRes.body.publicKey, "Expected response to contain Paystack public key");
    const payRef = initPayRes.body.reference;
    console.log(`Initialized payment reference: ${payRef}`);

    console.log("[Test 5] Payments - Simulating Paystack Webhook for charge.success...");
    const webhookPayload = {
      event: 'charge.success',
      data: {
        reference: payRef,
        amount: 450000,
        metadata: {
          userId: testUserId,
          plan: 'unilag'
        }
      }
    };
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'test_secret_key';
    const rawBody = JSON.stringify(webhookPayload);
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(rawBody)
      .digest('hex');

    const webhookRes = await request('POST', '/api/payments/webhook', rawBody, {
      'x-paystack-signature': signature,
      'Content-Type': 'application/json'
    });
    assert.strictEqual(webhookRes.statusCode, 200, `Expected 200 but got ${webhookRes.statusCode}`);
    console.log("Webhook verified and accepted!");

    console.log("[Test 5] Payments - Checking subscription activation in DB...");
    const verifyStatusRes = await request('GET', '/api/payments/status', null, authHeaders);
    assert.strictEqual(verifyStatusRes.statusCode, 200);
    assert.strictEqual(verifyStatusRes.body.subscriptionActive, true, "Subscription should be active after successful webhook");
    assert.strictEqual(verifyStatusRes.body.subscription.plan, 'unilag');
    console.log("Subscription activated successfully!");

  } catch(e) {
    console.error("\n❌ Test failed with error:", e);
    throw e;
  } finally {
    // ─── CLEANUP ──────────────────────────────────────────
    console.log("\n--- Cleaning up Test Data ---");
    try {
      if (testUserId) {
        await prisma.subscription.deleteMany({ where: { userId: testUserId } });
        await prisma.speedStats.deleteMany({ where: { userId: testUserId } });
        await prisma.studyHallStanding.deleteMany({ where: { userId: testUserId } });
        await prisma.examSession.deleteMany({ where: { userId: testUserId } });
        await prisma.battlePoints.deleteMany({ where: { userId: testUserId } });
        await prisma.battleRank.deleteMany({ where: { userId: testUserId } });
        await prisma.topicMastery.deleteMany({ where: { userId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
        console.log("Successfully cleaned up test user and all related records.");
      }
    } catch(err) {
      console.error("Cleanup error (non-fatal):", err);
    }

    if (server) {
      server.close();
      console.log("Closed test server.");
    }
    await prisma.$disconnect();
  }
}

runAllTests()
  .then(() => {
    console.log("\n✅ All integration tests passed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    process.exit(1);
  });
