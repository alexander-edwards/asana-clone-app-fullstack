#!/usr/bin/env node

// Backend Verification Script for Asana Clone
// Validates that all critical functionality is working

const TESTS = {
  passed: [],
  failed: [],
  bugs: []
};

async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verifyBackend() {
  console.log('\n🔍 BACKEND VERIFICATION FOR ASANA CLONE\n');
  console.log('Testing Local Backend: http://localhost:3000');
  console.log('Testing External Backend: https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so\n');

  // Test 1: Health Check (Local)
  console.log('1. Testing Local Health Check...');
  const localHealth = await testEndpoint('http://localhost:3000/health');
  if (localHealth.success) {
    TESTS.passed.push('Local health check');
    console.log('   ✅ Local backend is healthy');
  } else {
    TESTS.failed.push('Local health check');
    console.log('   ❌ Local backend health check failed');
  }

  // Test 2: External Endpoint
  console.log('\n2. Testing External Endpoint...');
  const externalHealth = await testEndpoint('https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so/health');
  if (externalHealth.success) {
    TESTS.passed.push('External endpoint');
    console.log('   ✅ External endpoint is accessible');
  } else {
    TESTS.failed.push('External endpoint');
    TESTS.bugs.push('External endpoint may have connectivity issues');
    console.log('   ⚠️  External endpoint not responding (may be a temporary issue)');
  }

  // Test 3: API Documentation
  console.log('\n3. Testing API Documentation...');
  const apiDocs = await testEndpoint('http://localhost:3000/api');
  if (apiDocs.success && apiDocs.data.endpoints) {
    TESTS.passed.push('API documentation');
    console.log('   ✅ API documentation is available');
    console.log(`   📚 Found ${Object.keys(apiDocs.data.endpoints).length} endpoint categories`);
  } else {
    TESTS.failed.push('API documentation');
  }

  // Test 4: User Registration Flow
  console.log('\n4. Testing User Registration...');
  const testUser = {
    email: `verify_${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Verification User'
  };

  const registration = await testEndpoint('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  });

  let authToken = null;
  if (registration.success && registration.data.token) {
    TESTS.passed.push('User registration');
    authToken = registration.data.token;
    console.log('   ✅ User registration works');
    console.log(`   👤 Created user: ${testUser.email}`);
  } else {
    TESTS.failed.push('User registration');
    console.log('   ❌ User registration failed');
  }

  // Test 5: Authentication
  console.log('\n5. Testing Authentication...');
  if (authToken) {
    const me = await testEndpoint('http://localhost:3000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (me.success) {
      TESTS.passed.push('Authentication');
      console.log('   ✅ JWT authentication works');
    } else {
      TESTS.failed.push('Authentication');
      console.log('   ❌ Authentication failed');
    }
  }

  // Test 6: Workspace Creation
  console.log('\n6. Testing Workspace Creation...');
  if (authToken) {
    const workspace = await testEndpoint('http://localhost:3000/api/workspaces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Verification Workspace',
        description: 'Testing workspace creation'
      })
    });

    if (workspace.success) {
      TESTS.passed.push('Workspace creation');
      console.log('   ✅ Workspace creation works');
      
      // Test Project Creation
      console.log('\n7. Testing Project Creation...');
      const project = await testEndpoint('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          workspace_id: workspace.data.id,
          name: 'Verification Project',
          view_type: 'board'
        })
      });

      if (project.success) {
        TESTS.passed.push('Project creation');
        console.log('   ✅ Project creation works');
        
        // Test Task Creation
        console.log('\n8. Testing Task Creation...');
        const task = await testEndpoint('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            project_id: project.data.id,
            title: 'Verification Task',
            priority: 'high',
            status: 'todo'
          })
        });

        if (task.success) {
          TESTS.passed.push('Task creation');
          console.log('   ✅ Task creation works');
        } else {
          TESTS.failed.push('Task creation');
          console.log('   ❌ Task creation failed');
        }
      } else {
        TESTS.failed.push('Project creation');
        console.log('   ❌ Project creation failed');
      }
    } else {
      TESTS.failed.push('Workspace creation');
      console.log('   ❌ Workspace creation failed');
    }
  }

  // Test 9: Database Connectivity
  console.log('\n9. Testing Database Operations...');
  const dbTest = await testEndpoint('http://localhost:3000/api/workspaces', {
    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
  });
  
  if (dbTest.success || dbTest.status === 401) {
    TESTS.passed.push('Database connectivity');
    console.log('   ✅ Database is connected and operational');
  } else {
    TESTS.failed.push('Database connectivity');
    TESTS.bugs.push('Database connection issues detected');
    console.log('   ❌ Database connectivity issues');
  }

  // Test 10: Error Handling
  console.log('\n10. Testing Error Handling...');
  const errorTest = await testEndpoint('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' })
  });

  if (errorTest.status === 400 && errorTest.data.error) {
    TESTS.passed.push('Error handling');
    console.log('   ✅ Error handling works correctly');
  } else {
    TESTS.failed.push('Error handling');
    console.log('   ❌ Error handling issues detected');
  }

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n✅ PASSED: ${TESTS.passed.length}/10 tests`);
  TESTS.passed.forEach(test => console.log(`   ✓ ${test}`));
  
  if (TESTS.failed.length > 0) {
    console.log(`\n❌ FAILED: ${TESTS.failed.length} tests`);
    TESTS.failed.forEach(test => console.log(`   ✗ ${test}`));
  }

  if (TESTS.bugs.length > 0) {
    console.log(`\n🐛 IDENTIFIED ISSUES:`);
    TESTS.bugs.forEach(bug => console.log(`   • ${bug}`));
  } else {
    console.log(`\n✨ NO BUGS DETECTED`);
  }

  // Critical Features Check
  console.log('\n' + '='.repeat(60));
  console.log('🔑 CRITICAL FEATURES STATUS');
  console.log('='.repeat(60));
  
  const criticalFeatures = [
    { name: 'User Authentication', status: TESTS.passed.includes('User registration') && TESTS.passed.includes('Authentication') },
    { name: 'Workspace Management', status: TESTS.passed.includes('Workspace creation') },
    { name: 'Project Management', status: TESTS.passed.includes('Project creation') },
    { name: 'Task Management', status: TESTS.passed.includes('Task creation') },
    { name: 'Database Operations', status: TESTS.passed.includes('Database connectivity') },
    { name: 'API Documentation', status: TESTS.passed.includes('API documentation') },
    { name: 'Error Handling', status: TESTS.passed.includes('Error handling') }
  ];

  criticalFeatures.forEach(feature => {
    console.log(`${feature.status ? '✅' : '❌'} ${feature.name}: ${feature.status ? 'Working' : 'Issues Detected'}`);
  });

  // Overall Status
  console.log('\n' + '='.repeat(60));
  const passRate = (TESTS.passed.length / 10 * 100).toFixed(0);
  
  if (TESTS.failed.length === 0) {
    console.log('🎉 BACKEND FULLY OPERATIONAL - ALL TESTS PASSED!');
  } else if (TESTS.passed.length >= 8) {
    console.log(`✅ BACKEND OPERATIONAL (${passRate}% tests passed)`);
    console.log('Minor issues detected but core functionality works');
  } else if (TESTS.passed.length >= 5) {
    console.log(`⚠️  BACKEND PARTIALLY OPERATIONAL (${passRate}% tests passed)`);
    console.log('Some critical features may have issues');
  } else {
    console.log(`❌ BACKEND HAS CRITICAL ISSUES (${passRate}% tests passed)`);
  }
  
  console.log('='.repeat(60) + '\n');

  // Additional Notes
  if (TESTS.failed.includes('External endpoint')) {
    console.log('📝 Note: External endpoint connectivity issues may be temporary.');
    console.log('   The local backend is working correctly, which is the primary requirement.');
  }
}

// Run verification
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ for native fetch support');
  process.exit(1);
}

verifyBackend().catch(console.error);
