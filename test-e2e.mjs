import { readFileSync } from 'fs';

// Load env vars from .env file
function loadEnv() {
  try {
    const content = readFileSync('.env', 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

// Test configuration - use unique emails to avoid conflicts
const TEST_USER_A = { email: `test-a-${Date.now()}@example.com`, password: 'TestPass123!' };
const TEST_USER_B = { email: `test-b-${Date.now()}@example.com`, password: 'TestPass456!' };

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

// Supabase Auth REST API helpers
async function signUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function runTests() {
  console.log('\n🧪 The Scent Handbook — E2E API Tests\n');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  API Base: ${BASE_URL}\n`);

  // Test 1: Unauthenticated requests should return 401
  console.log('--- Test: Unauthenticated Access ---');
  {
    const res = await fetch(`${BASE_URL}/api/inventory`);
    assert(res.status === 401, `GET /api/inventory without token returns 401 (got ${res.status})`);
  }
  {
    const res = await fetch(`${BASE_URL}/api/batches`);
    assert(res.status === 401, `GET /api/batches without token returns 401 (got ${res.status})`);
  }

  // Test 2: Sign up two test users
  console.log('\n--- Test: User Registration ---');
  const userASignup = await signUp(TEST_USER_A.email, TEST_USER_A.password);
  assert(userASignup.id || userASignup.user?.id, `User A signup succeeded`);
  
  const userBSignup = await signUp(TEST_USER_B.email, TEST_USER_B.password);
  assert(userBSignup.id || userBSignup.user?.id, `User B signup succeeded`);

  // Test 3: Sign in both users and get tokens
  console.log('\n--- Test: Authentication Token Generation ---');
  const userAAuth = await signIn(TEST_USER_A.email, TEST_USER_A.password);
  const tokenA = userAAuth.access_token;
  assert(!!tokenA, `User A obtained access token`);

  const userBAuth = await signIn(TEST_USER_B.email, TEST_USER_B.password);
  const tokenB = userBAuth.access_token;
  assert(!!tokenB, `User B obtained access token`);

  if (!tokenA || !tokenB) {
    console.error('\n⚠️  Cannot proceed without valid tokens. Check if email confirmation is disabled in Supabase Auth settings.');
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const headersA = { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
  const headersB = { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' };

  // Test 4: Authenticated inventory access
  console.log('\n--- Test: Authenticated Inventory Access ---');
  {
    const res = await fetch(`${BASE_URL}/api/inventory`, { headers: headersA });
    assert(res.status === 200, `User A GET /api/inventory returns 200 (got ${res.status})`);
    const data = await res.json();
    assert(Array.isArray(data.items), 'Response contains items array');
  }

  // Test 5: Create a batch for User A
  console.log('\n--- Test: Batch Creation ---');
  let batchIdA;
  {
    const res = await fetch(`${BASE_URL}/api/batches`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        fragrance_name: 'E2E Test Fragrance',
        total_volume: 30,
        concentration: 20,
        oil_amount: 6,
        alcohol_amount: 24,
      }),
    });
    assert(res.status === 201, `User A POST /api/batches returns 201 (got ${res.status})`);
    const data = await res.json();
    batchIdA = data.batch?.id;
    assert(!!batchIdA, 'Batch was created with an ID');
  }

  // Test 6: User A can see their batch
  console.log('\n--- Test: User A Sees Own Batches ---');
  {
    const res = await fetch(`${BASE_URL}/api/batches`, { headers: headersA });
    const data = await res.json();
    const found = data.batches?.some(b => b.id === batchIdA);
    assert(found, 'User A can see their own batch');
  }

  // Test 7: Cross-tenant isolation — User B cannot see User A's batch
  console.log('\n--- Test: Cross-Tenant Isolation ---');
  {
    const res = await fetch(`${BASE_URL}/api/batches`, { headers: headersB });
    const data = await res.json();
    const found = data.batches?.some(b => b.id === batchIdA);
    assert(!found, 'User B CANNOT see User A\'s batch (isolation works)');
  }

  // Test 8: User B cannot see User A's inventory
  {
    const resA = await fetch(`${BASE_URL}/api/inventory`, { headers: headersA });
    const dataA = await resA.json();
    const resB = await fetch(`${BASE_URL}/api/inventory`, { headers: headersB });
    const dataB = await resB.json();
    // User B's inventory should not contain any items from User A
    const aIds = (dataA.items || []).map(i => i.fragrance_id);
    const bIds = (dataB.items || []).map(i => i.fragrance_id);
    const overlap = aIds.filter(id => bIds.includes(id));
    assert(overlap.length === 0 || aIds.length === 0, 'Inventory data is isolated between users');
  }

  // Test 9: Delete the test batch
  console.log('\n--- Test: Batch Deletion ---');
  if (batchIdA) {
    const res = await fetch(`${BASE_URL}/api/batches?id=${batchIdA}`, {
      method: 'DELETE',
      headers: headersA,
    });
    assert(res.status === 200, `User A can delete their own batch (got ${res.status})`);
  }

  // Summary
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(40)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
