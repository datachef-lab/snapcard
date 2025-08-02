const fetch = require('node-fetch');

async function testAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('Testing API endpoints...');

  // Test 1: Check if the server is running
  try {
    const response = await fetch(`${baseUrl}/api/students?uid=test`);
    console.log('Server status:', response.status);
  } catch (error) {
    console.error('Server not running:', error.message);
    return;
  }

  // Test 2: Check templates endpoint
  try {
    const response = await fetch(`${baseUrl}/api/id-card-template`);
    const data = await response.json();
    console.log('Templates response:', data);
  } catch (error) {
    console.error('Templates API error:', error.message);
  }

  // Test 3: Check images endpoint (this will fail without a real UID)
  try {
    const response = await fetch(`${baseUrl}/api/images?uid=test&crop=true`);
    console.log('Images API status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Images API error:', errorText);
    }
  } catch (error) {
    console.error('Images API error:', error.message);
  }
}

testAPI(); 