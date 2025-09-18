#!/usr/bin/env node

// Comprehensive Test Suite for Asana Clone Backend
// Tests all endpoints with various scenarios

const baseURL = process.argv[2] || 'http://localhost:3000';

class AsanaAPITester {
  constructor() {
    this.baseURL = baseURL;
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
    this.testData = {};
  }

  async apiCall(method, endpoint, body = null, token = null, expectError = false) {
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
      const response = await fetch(`${this.baseURL}${endpoint}`, options);
      const data = await response.json();
      
      if (!response.ok && !expectError) {
        this.results.failed.push({
          test: `${method} ${endpoint}`,
          error: data.error || `HTTP ${response.status}`,
          details: data
        });
        return { success: false, data, status: response.status };
      }
      
      if (response.ok && expectError) {
        this.results.failed.push({
          test: `${method} ${endpoint}`,
          error: 'Expected error but got success',
          details: data
        });
        return { success: false, data };
      }
      
      if (expectError) {
        this.results.passed.push(`${method} ${endpoint} (Expected Error)`);
      } else {
        this.results.passed.push(`${method} ${endpoint}`);
      }
      
      return { success: true, data, status: response.status };
    } catch (error) {
      this.results.failed.push({
        test: `${method} ${endpoint}`,
        error: error.message,
        type: 'Network Error'
      });
      return { success: false, error };
    }
  }

  async runTests() {
    console.log(`\n🧪 COMPREHENSIVE TESTING OF ASANA CLONE API`);
    console.log(`📍 Testing: ${this.baseURL}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    // Test Categories
    await this.testHealthAndDocs();
    await this.testAuthentication();
    await this.testWorkspaces();
    await this.testProjects();
    await this.testSections();
    await this.testTasks();
    await this.testComments();
    await this.testErrorHandling();
    await this.testDataIntegrity();
    await this.testPerformance();

    this.printResults();
  }

  async testHealthAndDocs() {
    console.log('\n📋 TESTING HEALTH & DOCUMENTATION\n');
    
    // Health check
    const health = await this.apiCall('GET', '/health');
    if (health.success && health.data.status === 'OK') {
      console.log('✅ Health check passed');
    }

    // API documentation
    const docs = await this.apiCall('GET', '/api');
    if (docs.success && docs.data.endpoints) {
      console.log('✅ API documentation available');
    }
  }

  async testAuthentication() {
    console.log('\n🔐 TESTING AUTHENTICATION\n');

    // Test registration
    const timestamp = Date.now();
    this.testData.user1 = {
      email: `user1_${timestamp}@test.com`,
      password: 'SecurePass123!',
      name: 'Test User One'
    };

    const reg1 = await this.apiCall('POST', '/api/auth/register', this.testData.user1);
    if (reg1.success) {
      this.testData.token1 = reg1.data.token;
      this.testData.userId1 = reg1.data.user.id;
      console.log(`✅ User 1 registered: ${this.testData.user1.email}`);
    }

    // Test duplicate email
    await this.apiCall('POST', '/api/auth/register', this.testData.user1, null, true);

    // Test login
    const login = await this.apiCall('POST', '/api/auth/login', {
      email: this.testData.user1.email,
      password: this.testData.user1.password
    });
    if (login.success) {
      console.log('✅ Login successful');
    }

    // Test wrong password
    await this.apiCall('POST', '/api/auth/login', {
      email: this.testData.user1.email,
      password: 'WrongPassword'
    }, null, true);

    // Test get current user
    await this.apiCall('GET', '/api/auth/me', null, this.testData.token1);

    // Test unauthorized access
    await this.apiCall('GET', '/api/auth/me', null, null, true);

    // Register second user for collaboration tests
    this.testData.user2 = {
      email: `user2_${timestamp}@test.com`,
      password: 'SecurePass456!',
      name: 'Test User Two'
    };

    const reg2 = await this.apiCall('POST', '/api/auth/register', this.testData.user2);
    if (reg2.success) {
      this.testData.token2 = reg2.data.token;
      this.testData.userId2 = reg2.data.user.id;
      console.log(`✅ User 2 registered: ${this.testData.user2.email}`);
    }
  }

  async testWorkspaces() {
    console.log('\n🏢 TESTING WORKSPACES\n');

    // Create workspace
    const ws = await this.apiCall('POST', '/api/workspaces', {
      name: 'Test Workspace',
      description: 'A comprehensive test workspace'
    }, this.testData.token1);

    if (ws.success) {
      this.testData.workspaceId = ws.data.id;
      console.log(`✅ Workspace created: ${ws.data.id}`);
    }

    // Get all workspaces
    await this.apiCall('GET', '/api/workspaces', null, this.testData.token1);

    // Get single workspace
    await this.apiCall('GET', `/api/workspaces/${this.testData.workspaceId}`, null, this.testData.token1);

    // Update workspace
    await this.apiCall('PUT', `/api/workspaces/${this.testData.workspaceId}`, {
      name: 'Updated Workspace',
      description: 'Updated description'
    }, this.testData.token1);

    // Add member to workspace
    const addMember = await this.apiCall('POST', `/api/workspaces/${this.testData.workspaceId}/members`, {
      email: this.testData.user2.email,
      role: 'member'
    }, this.testData.token1);

    if (addMember.success) {
      console.log('✅ Member added to workspace');
    }

    // Test access control - user2 should now have access
    await this.apiCall('GET', `/api/workspaces/${this.testData.workspaceId}`, null, this.testData.token2);

    // Test invalid workspace ID
    await this.apiCall('GET', '/api/workspaces/invalid-id', null, this.testData.token1, true);
  }

  async testProjects() {
    console.log('\n📁 TESTING PROJECTS\n');

    // Create project
    const project = await this.apiCall('POST', '/api/projects', {
      workspace_id: this.testData.workspaceId,
      name: 'Test Project',
      description: 'A comprehensive test project',
      color: '#FF5733',
      view_type: 'board'
    }, this.testData.token1);

    if (project.success) {
      this.testData.projectId = project.data.id;
      console.log(`✅ Project created: ${project.data.id}`);
    }

    // Get all projects in workspace
    const projects = await this.apiCall('GET', `/api/projects/workspace/${this.testData.workspaceId}`, null, this.testData.token1);
    if (projects.success) {
      console.log(`✅ Found ${projects.data.length} projects`);
    }

    // Get single project
    await this.apiCall('GET', `/api/projects/${this.testData.projectId}`, null, this.testData.token1);

    // Update project
    await this.apiCall('PUT', `/api/projects/${this.testData.projectId}`, {
      name: 'Updated Project Name',
      status: 'active'
    }, this.testData.token1);

    // Test different view types
    const viewTypes = ['list', 'board', 'timeline', 'calendar'];
    for (const viewType of viewTypes) {
      await this.apiCall('PUT', `/api/projects/${this.testData.projectId}`, {
        view_type: viewType
      }, this.testData.token1);
    }

    // Add member to project
    await this.apiCall('POST', `/api/projects/${this.testData.projectId}/members`, {
      email: this.testData.user2.email,
      role: 'member'
    }, this.testData.token1);
  }

  async testSections() {
    console.log('\n📑 TESTING SECTIONS\n');

    // Get default sections (should be created automatically)
    const sections = await this.apiCall('GET', `/api/sections/project/${this.testData.projectId}`, null, this.testData.token1);
    
    if (sections.success && sections.data.length > 0) {
      this.testData.sectionId = sections.data[0].id;
      console.log(`✅ Found ${sections.data.length} default sections`);
    }

    // Create additional section
    const newSection = await this.apiCall('POST', '/api/sections', {
      project_id: this.testData.projectId,
      name: 'Custom Section'
    }, this.testData.token1);

    if (newSection.success) {
      this.testData.customSectionId = newSection.data.id;
      console.log('✅ Custom section created');
    }

    // Update section
    await this.apiCall('PUT', `/api/sections/${this.testData.customSectionId}`, {
      name: 'Renamed Section',
      position: 1
    }, this.testData.token1);

    // Test section reordering
    await this.apiCall('PUT', `/api/sections/${this.testData.customSectionId}`, {
      position: 0
    }, this.testData.token1);
  }

  async testTasks() {
    console.log('\n✅ TESTING TASKS\n');

    // Create multiple tasks with different configurations
    const taskConfigs = [
      {
        title: 'High Priority Task',
        description: 'This is a high priority task',
        priority: 'high',
        status: 'todo',
        tags: ['urgent', 'important']
      },
      {
        title: 'Task with Due Date',
        description: 'This task has a due date',
        priority: 'medium',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['deadline']
      },
      {
        title: 'Blocked Task',
        description: 'This task is blocked',
        priority: 'low',
        status: 'blocked'
      }
    ];

    this.testData.taskIds = [];
    
    for (const config of taskConfigs) {
      const task = await this.apiCall('POST', '/api/tasks', {
        project_id: this.testData.projectId,
        section_id: this.testData.sectionId,
        ...config
      }, this.testData.token1);

      if (task.success) {
        this.testData.taskIds.push(task.data.id);
        console.log(`✅ Created task: ${config.title}`);
      }
    }

    if (this.testData.taskIds.length > 0) {
      this.testData.taskId = this.testData.taskIds[0];
    }

    // Get all tasks in project
    const tasks = await this.apiCall('GET', `/api/tasks/project/${this.testData.projectId}`, null, this.testData.token1);
    if (tasks.success) {
      console.log(`✅ Retrieved ${tasks.data.length} tasks`);
    }

    // Get single task
    await this.apiCall('GET', `/api/tasks/${this.testData.taskId}`, null, this.testData.token1);

    // Update task status progression
    const statusProgression = ['todo', 'in_progress', 'completed'];
    for (const status of statusProgression) {
      await this.apiCall('PUT', `/api/tasks/${this.testData.taskId}`, {
        status: status
      }, this.testData.token1);
    }

    // Add assignee
    await this.apiCall('POST', `/api/tasks/${this.testData.taskId}/assignees`, {
      user_id: this.testData.userId2
    }, this.testData.token1);

    // Test task with custom fields
    const customTask = await this.apiCall('POST', '/api/tasks', {
      project_id: this.testData.projectId,
      title: 'Task with Custom Fields',
      custom_fields: {
        estimated_hours: 8,
        client: 'Test Client',
        budget: 1000
      }
    }, this.testData.token1);

    if (customTask.success) {
      console.log('✅ Task with custom fields created');
    }

    // Test moving task between sections
    if (this.testData.customSectionId) {
      await this.apiCall('PUT', `/api/tasks/${this.testData.taskId}`, {
        section_id: this.testData.customSectionId
      }, this.testData.token1);
    }
  }

  async testComments() {
    console.log('\n💬 TESTING COMMENTS\n');

    // Create comment
    const comment = await this.apiCall('POST', '/api/comments', {
      task_id: this.testData.taskId,
      content: 'This is a test comment'
    }, this.testData.token1);

    if (comment.success) {
      this.testData.commentId = comment.data.id;
      console.log('✅ Comment created');
    }

    // Create reply to comment
    const reply = await this.apiCall('POST', '/api/comments', {
      task_id: this.testData.taskId,
      content: 'This is a reply',
      parent_id: this.testData.commentId
    }, this.testData.token2);

    if (reply.success) {
      console.log('✅ Reply created');
    }

    // Get all comments for task
    const comments = await this.apiCall('GET', `/api/comments/task/${this.testData.taskId}`, null, this.testData.token1);
    if (comments.success) {
      console.log(`✅ Retrieved ${comments.data.length} comments`);
    }

    // Update comment
    await this.apiCall('PUT', `/api/comments/${this.testData.commentId}`, {
      content: 'Updated comment content'
    }, this.testData.token1);

    // Test user can't update another user's comment
    await this.apiCall('PUT', `/api/comments/${this.testData.commentId}`, {
      content: 'Trying to update someone else\'s comment'
    }, this.testData.token2, true);
  }

  async testErrorHandling() {
    console.log('\n⚠️ TESTING ERROR HANDLING\n');

    // Test invalid input validation
    await this.apiCall('POST', '/api/auth/register', {
      email: 'invalid-email',
      password: '123',  // Too short
      name: ''
    }, null, true);

    // Test missing required fields
    await this.apiCall('POST', '/api/tasks', {
      title: 'Task without project'
    }, this.testData.token1, true);

    // Test invalid IDs
    await this.apiCall('GET', '/api/tasks/00000000-0000-0000-0000-000000000000', null, this.testData.token1, true);

    // Test unauthorized access to private resources
    const privateWs = await this.apiCall('POST', '/api/workspaces', {
      name: 'Private Workspace'
    }, this.testData.token1);

    if (privateWs.success) {
      // User2 shouldn't have access to this workspace
      await this.apiCall('GET', `/api/workspaces/${privateWs.data.id}`, null, this.testData.token2, true);
    }

    console.log('✅ Error handling tests completed');
  }

  async testDataIntegrity() {
    console.log('\n🔍 TESTING DATA INTEGRITY\n');

    // Test cascading deletes
    const testProject = await this.apiCall('POST', '/api/projects', {
      workspace_id: this.testData.workspaceId,
      name: 'Delete Test Project'
    }, this.testData.token1);

    if (testProject.success) {
      // Create task in project
      const testTask = await this.apiCall('POST', '/api/tasks', {
        project_id: testProject.data.id,
        title: 'Task to be deleted'
      }, this.testData.token1);

      // Delete project should cascade delete tasks
      await this.apiCall('DELETE', `/api/projects/${testProject.data.id}`, null, this.testData.token1);

      // Task should no longer exist
      if (testTask.success) {
        await this.apiCall('GET', `/api/tasks/${testTask.data.id}`, null, this.testData.token1, true);
      }
    }

    // Test unique constraints
    if (this.testData.userId2 && this.testData.workspaceId) {
      // Try adding same member twice
      await this.apiCall('POST', `/api/workspaces/${this.testData.workspaceId}/members`, {
        email: this.testData.user2.email,
        role: 'member'
      }, this.testData.token1, true);
    }

    console.log('✅ Data integrity tests completed');
  }

  async testPerformance() {
    console.log('\n⚡ TESTING PERFORMANCE\n');

    const startTime = Date.now();
    const requests = [];

    // Batch create tasks
    for (let i = 0; i < 10; i++) {
      requests.push(
        this.apiCall('POST', '/api/tasks', {
          project_id: this.testData.projectId,
          title: `Performance Test Task ${i}`,
          description: `Task ${i} for performance testing`
        }, this.testData.token1)
      );
    }

    await Promise.all(requests);
    const duration = Date.now() - startTime;

    if (duration < 5000) {
      console.log(`✅ Batch operations completed in ${duration}ms`);
    } else {
      this.results.warnings.push(`Performance: Batch operations took ${duration}ms (>5000ms)`);
    }

    // Test pagination/filtering
    const filteredTasks = await this.apiCall('GET', 
      `/api/tasks/project/${this.testData.projectId}?status=todo`, 
      null, 
      this.testData.token1
    );

    if (filteredTasks.success) {
      console.log(`✅ Filtering working, found ${filteredTasks.data.length} todo tasks`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n✅ PASSED: ${this.results.passed.length} tests`);
    if (this.results.passed.length > 0 && this.results.passed.length <= 20) {
      this.results.passed.forEach(test => console.log(`   ✓ ${test}`));
    } else if (this.results.passed.length > 20) {
      console.log(`   ✓ ${this.results.passed.length} tests passed successfully`);
    }

    if (this.results.failed.length > 0) {
      console.log(`\n❌ FAILED: ${this.results.failed.length} tests`);
      this.results.failed.forEach(fail => {
        console.log(`   ✗ ${fail.test}`);
        console.log(`     Error: ${fail.error}`);
        if (fail.details) {
          console.log(`     Details: ${JSON.stringify(fail.details).substring(0, 100)}`);
        }
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS: ${this.results.warnings.length}`);
      this.results.warnings.forEach(warning => console.log(`   ⚠ ${warning}`));
    }

    console.log('\n' + '='.repeat(60));
    
    const passRate = (this.results.passed.length / (this.results.passed.length + this.results.failed.length) * 100).toFixed(1);
    
    if (this.results.failed.length === 0) {
      console.log(`🎉 ALL TESTS PASSED! (${passRate}% pass rate)`);
    } else {
      console.log(`📈 Pass Rate: ${passRate}%`);
    }
    
    console.log(`🏁 Testing completed at ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');

    // Save test data for reference
    console.log('\n📝 TEST DATA FOR REFERENCE:');
    console.log(`   Workspace ID: ${this.testData.workspaceId}`);
    console.log(`   Project ID: ${this.testData.projectId}`);
    console.log(`   Task IDs: ${this.testData.taskIds?.join(', ')}`);
    console.log(`   User 1: ${this.testData.user1?.email}`);
    console.log(`   User 2: ${this.testData.user2?.email}`);
  }
}

// Run tests
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ for native fetch support');
  process.exit(1);
}

const tester = new AsanaAPITester();
tester.runTests().catch(console.error);
