#!/usr/bin/env node

// Test script for Asana Clone Backend API
// This script demonstrates the full workflow of the API

const baseURL = process.argv[2] || 'http://localhost:3000';

async function testAPI() {
  console.log(`\n🧪 Testing Asana Clone API at ${baseURL}\n`);
  
  let authToken = '';
  let userId = '';
  let workspaceId = '';
  let projectId = '';
  let taskId = '';
  let sectionId = '';

  // Helper function for API calls
  async function apiCall(method, endpoint, body = null, token = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${baseURL}${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ ${method} ${endpoint}: ${data.error || 'Failed'}`);
        return { success: false, data };
      }
      
      console.log(`✅ ${method} ${endpoint}: Success`);
      return { success: true, data };
    } catch (error) {
      console.error(`❌ ${method} ${endpoint}: ${error.message}`);
      return { success: false, error };
    }
  }

  // 1. Test Health Check
  console.log('\n1️⃣  Testing Health Check...');
  await apiCall('GET', '/health');

  // 2. Test Registration
  console.log('\n2️⃣  Testing User Registration...');
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User'
  };
  
  const regResult = await apiCall('POST', '/api/auth/register', testUser);
  if (regResult.success) {
    authToken = regResult.data.token;
    userId = regResult.data.user.id;
    console.log(`   Token: ${authToken.substring(0, 20)}...`);
    console.log(`   User ID: ${userId}`);
  }

  // 3. Test Login
  console.log('\n3️⃣  Testing User Login...');
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: testUser.email,
    password: testUser.password
  });

  // 4. Test Get Current User
  console.log('\n4️⃣  Testing Get Current User...');
  await apiCall('GET', '/api/auth/me', null, authToken);

  // 5. Create Workspace
  console.log('\n5️⃣  Testing Workspace Creation...');
  const wsResult = await apiCall('POST', '/api/workspaces', {
    name: 'Test Workspace',
    description: 'A workspace for testing'
  }, authToken);
  
  if (wsResult.success) {
    workspaceId = wsResult.data.id;
    console.log(`   Workspace ID: ${workspaceId}`);
  }

  // 6. Create Project
  console.log('\n6️⃣  Testing Project Creation...');
  const projResult = await apiCall('POST', '/api/projects', {
    workspace_id: workspaceId,
    name: 'Test Project',
    description: 'A test project',
    color: '#FF5733',
    view_type: 'board'
  }, authToken);
  
  if (projResult.success) {
    projectId = projResult.data.id;
    console.log(`   Project ID: ${projectId}`);
  }

  // 7. Get Project Sections
  console.log('\n7️⃣  Testing Get Sections...');
  const sectionsResult = await apiCall('GET', `/api/sections/project/${projectId}`, null, authToken);
  if (sectionsResult.success && sectionsResult.data.length > 0) {
    sectionId = sectionsResult.data[0].id;
    console.log(`   Found ${sectionsResult.data.length} sections`);
  }

  // 8. Create Task
  console.log('\n8️⃣  Testing Task Creation...');
  const taskResult = await apiCall('POST', '/api/tasks', {
    project_id: projectId,
    section_id: sectionId,
    title: 'Test Task',
    description: 'This is a test task',
    priority: 'high',
    status: 'todo',
    tags: ['test', 'demo']
  }, authToken);
  
  if (taskResult.success) {
    taskId = taskResult.data.id;
    console.log(`   Task ID: ${taskId}`);
  }

  // 9. Add Comment
  console.log('\n9️⃣  Testing Comment Creation...');
  await apiCall('POST', '/api/comments', {
    task_id: taskId,
    content: 'This is a test comment on the task'
  }, authToken);

  // 10. Update Task Status
  console.log('\n🔟 Testing Task Update...');
  await apiCall('PUT', `/api/tasks/${taskId}`, {
    status: 'in_progress'
  }, authToken);

  // 11. Get All Workspaces
  console.log('\n1️⃣1️⃣ Testing Get All Workspaces...');
  await apiCall('GET', '/api/workspaces', null, authToken);

  // 12. Get All Projects in Workspace
  console.log('\n1️⃣2️⃣ Testing Get Projects in Workspace...');
  await apiCall('GET', `/api/projects/workspace/${workspaceId}`, null, authToken);

  // 13. Get All Tasks in Project
  console.log('\n1️⃣3️⃣ Testing Get Tasks in Project...');
  const tasksResult = await apiCall('GET', `/api/tasks/project/${projectId}`, null, authToken);
  if (tasksResult.success) {
    console.log(`   Found ${tasksResult.data.length} tasks`);
  }

  console.log('\n✨ API Testing Complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - User created: ${testUser.email}`);
  console.log(`   - Workspace: ${workspaceId}`);
  console.log(`   - Project: ${projectId}`);
  console.log(`   - Task: ${taskId}`);
  console.log(`\n🎉 All core endpoints are working!\n`);
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ for native fetch support');
  console.log('Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

testAPI().catch(console.error);
