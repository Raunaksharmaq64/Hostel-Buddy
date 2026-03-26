const mongoose = require('mongoose');
const User = require('./models/User');

const API_URL = 'http://localhost:5000/api/auth';
const testEmail = 'testverify' + Date.now() + '@example.com';
const testPassword = 'Password123!';

async function fetchAPI(endpoint, method, body) {
  const res = await fetch(API_URL + endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() };
}

async function runTest() {
  try {
    console.log("Connecting to DB...");
    await mongoose.connect('mongodb+srv://raunakDataBase:raunak@123raunak1.mvceyao.mongodb.net/hostelbuddy');
    console.log("DB connected.");

    console.log(`\n--- 1. Testing Registration ---`);
    let res = await fetchAPI('/register', 'POST', {
      name: 'Integration Test',
      email: testEmail,
      password: testPassword,
      role: 'Student',
      phone: '9999999999'
    });
    console.log("Register response:", res.data);
    if (res.status !== 201 || !res.data.requiresVerification) throw new Error("Registration did not return requiresVerification.");

    console.log(`\n--- 2. Testing Unverified Login Attempt ---`);
    res = await fetchAPI('/login', 'POST', { email: testEmail, password: testPassword, role: 'Student' });
    console.log("Login response:", res.data);
    if (res.status !== 403 || !res.data.requiresVerification) throw new Error("Login did not block unverified user correctly.");

    console.log(`\n--- 3. Extracting OTP from DB ---`);
    const dbUser = await User.findOne({ email: testEmail });
    if (!dbUser) throw new Error("User not found in DB.");
    const otp = dbUser.emailVerificationOtp;
    console.log("Extracted OTP:", otp);

    console.log(`\n--- 4. Testing OTP Verification ---`);
    res = await fetchAPI('/verify-email', 'POST', { email: testEmail, otp });
    console.log("Verify response:", res.data);
    if (res.status !== 200 || !res.data.token) throw new Error("OTP verification failed to return JWT.");

    console.log(`\n--- 5. Testing Verified Login ---`);
    res = await fetchAPI('/login', 'POST', { email: testEmail, password: testPassword, role: 'Student' });
    console.log("Login response:", res.data);
    if (res.status !== 200 || !res.data.token) throw new Error("Verified user failed to login.");

    console.log("\n✅ ALL TESTS PASSED!");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Give server time to boot if it was restarted
setTimeout(runTest, 2000);
