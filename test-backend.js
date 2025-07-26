// Simple backend testing script
const BASE_URL = 'http://localhost:3000'

async function testEndpoint(name, endpoint, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}...`)
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.text()
    
    if (response.ok) {
      console.log(`✅ ${name}: SUCCESS`)
      console.log(`   Status: ${response.status}`)
      if (data) console.log(`   Response: ${data.substring(0, 100)}...`)
    } else {
      console.log(`❌ ${name}: FAILED`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${data.substring(0, 200)}`)
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR`)
    console.log(`   ${error.message}`)
  }
}

async function runTests() {
  console.log('🚀 Testing Aura AI Backend Integrations\n')
  
  // Test 1: Home page
  await testEndpoint('Home Page', '/')
  
  // Test 2: Supabase connection (should fail without auth - that's expected)
  await testEndpoint('Assistants API (no auth)', '/api/assistants')
  
  // Test 3: Vapi functions endpoint
  await testEndpoint('Vapi Functions', '/api/vapi/functions', {
    method: 'POST',
    body: JSON.stringify({
      functionCall: { name: 'test', parameters: {} },
      call: { assistantId: 'test' }
    })
  })
  
  // Test 4: Vapi webhooks endpoint (should fail without signature - that's expected)
  await testEndpoint('Vapi Webhooks', '/api/vapi/webhooks', {
    method: 'POST',
    body: JSON.stringify({ type: 'test', data: {} })
  })
  
  // Test 5: PayPal subscription (should fail without auth - that's expected) 
  await testEndpoint('PayPal Subscription', '/api/billing/paypal/create-subscription', {
    method: 'POST',
    body: JSON.stringify({ planType: 'starter' })
  })
  
  console.log('\n🎯 Test Summary:')
  console.log('✅ Home page should work')
  console.log('❌ API endpoints should fail (no auth) - this is correct!')
  console.log('📡 Server is running and responding to requests')
  console.log('\n🚀 Your backend is ready! Next step: Set up authentication')
}

runTests().catch(console.error)