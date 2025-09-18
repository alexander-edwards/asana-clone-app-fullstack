const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // In production, specify your frontend URL
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const commentRoutes = require('./routes/comments');
const sectionRoutes = require('./routes/sections');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/sections', sectionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Asana Clone Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Asana Clone API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user (requires auth)',
        'PUT /api/auth/profile': 'Update user profile (requires auth)'
      },
      workspaces: {
        'GET /api/workspaces': 'Get all workspaces for user',
        'GET /api/workspaces/:id': 'Get single workspace',
        'POST /api/workspaces': 'Create workspace',
        'PUT /api/workspaces/:id': 'Update workspace',
        'DELETE /api/workspaces/:id': 'Delete workspace',
        'POST /api/workspaces/:id/members': 'Add member to workspace',
        'DELETE /api/workspaces/:id/members/:userId': 'Remove member from workspace'
      },
      projects: {
        'GET /api/projects/workspace/:workspaceId': 'Get all projects in workspace',
        'GET /api/projects/:id': 'Get single project',
        'POST /api/projects': 'Create project',
        'PUT /api/projects/:id': 'Update project',
        'DELETE /api/projects/:id': 'Delete project',
        'POST /api/projects/:id/members': 'Add member to project',
        'DELETE /api/projects/:id/members/:userId': 'Remove member from project'
      },
      tasks: {
        'GET /api/tasks/project/:projectId': 'Get all tasks in project',
        'GET /api/tasks/:id': 'Get single task',
        'POST /api/tasks': 'Create task',
        'PUT /api/tasks/:id': 'Update task',
        'DELETE /api/tasks/:id': 'Delete task',
        'POST /api/tasks/:id/assignees': 'Add assignee to task',
        'DELETE /api/tasks/:id/assignees/:userId': 'Remove assignee from task'
      },
      sections: {
        'GET /api/sections/project/:projectId': 'Get all sections in project',
        'POST /api/sections': 'Create section',
        'PUT /api/sections/:id': 'Update section',
        'DELETE /api/sections/:id': 'Delete section'
      },
      comments: {
        'GET /api/comments/task/:taskId': 'Get all comments for task',
        'POST /api/comments': 'Create comment',
        'PUT /api/comments/:id': 'Update comment',
        'DELETE /api/comments/:id': 'Delete comment'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Asana Clone Backend API is running on http://0.0.0.0:${PORT}`);
  console.log(`📚 API Documentation available at http://0.0.0.0:${PORT}/api`);
  console.log(`🏥 Health check available at http://0.0.0.0:${PORT}/health`);
});
