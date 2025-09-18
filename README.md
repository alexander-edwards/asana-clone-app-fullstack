# 🚀 Asana Clone - Full Stack Application

A comprehensive project management application inspired by Asana, built with modern web technologies. Features a complete task management system with workspaces, projects, tasks, and real-time collaboration.

## 🌐 Live Demo

- **Frontend**: https://asana-frontend-morphvm-s6un9i69.http.cloud.morph.so
- **Backend API**: https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so
- **API Documentation**: https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so/api

## Features

### Core Functionality
- **User Authentication**: Secure registration and login system with JWT tokens
- **Workspaces**: Create and manage multiple workspaces for different teams or organizations
- **Projects**: Organize work into projects with customizable views (list, board, timeline, calendar)
- **Tasks**: Create, assign, and track tasks with rich metadata
- **Sections**: Organize tasks into sections for better project structure
- **Comments**: Collaborate with threaded comments on tasks
- **Real-time Updates**: Live collaboration features (WebSocket support ready)

### Task Management
- Task assignment to multiple users
- Priority levels (Low, Medium, High, Urgent)
- Task status tracking (Todo, In Progress, Completed, Blocked)
- Due dates and start dates
- Custom fields for additional metadata
- Task dependencies
- File attachments
- Tags for categorization

### Collaboration
- Workspace and project member management
- Role-based access control (Admin, Member)
- Comments with nested replies
- Activity tracking
- User profiles with avatars

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database (hosted on Neon)
- **JWT** for authentication
- **bcrypt** for password hashing
- **Express Validator** for input validation
- **Multer** for file uploads
- **CORS** enabled for cross-origin requests

### Database Schema
- Users management
- Workspaces with member roles
- Projects with customizable settings
- Tasks with rich metadata
- Comments with threading
- Attachments storage
- Task dependencies
- Custom fields support

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Workspaces
- `GET /api/workspaces` - Get user's workspaces
- `GET /api/workspaces/:id` - Get workspace details
- `POST /api/workspaces` - Create workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace
- `POST /api/workspaces/:id/members` - Add member
- `DELETE /api/workspaces/:id/members/:userId` - Remove member

### Projects
- `GET /api/projects/workspace/:workspaceId` - Get workspace projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member

### Tasks
- `GET /api/tasks/project/:projectId` - Get project tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/assignees` - Add assignee
- `DELETE /api/tasks/:id/assignees/:userId` - Remove assignee

### Sections
- `GET /api/sections/project/:projectId` - Get project sections
- `POST /api/sections` - Create section
- `PUT /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section

### Comments
- `GET /api/comments/task/:taskId` - Get task comments
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

## Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/alexander-edwards/asana-clone-app-fullstack.git
cd asana-clone-app-fullstack/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=production
```

4. Run the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Documentation

The API documentation is available at:
- Local: `http://localhost:3000/api`
- Production: `https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so/api`

Health check endpoint:
- Local: `http://localhost:3000/health`
- Production: `https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so/health`

## Production Deployment

The backend is currently deployed and accessible at:
- **Backend API**: https://asana-backend-morphvm-s6un9i69.http.cloud.morph.so

## Database

The application uses PostgreSQL hosted on Neon with the following key tables:
- `users` - User accounts
- `workspaces` - Team workspaces
- `projects` - Projects within workspaces
- `tasks` - Individual tasks
- `sections` - Task groupings
- `comments` - Task discussions
- `attachments` - File uploads
- `task_assignees` - Task assignments
- `project_members` - Project access control
- `workspace_members` - Workspace access control

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
- CORS configuration for secure cross-origin requests
- Role-based access control

## License

MIT

## Contributing

Feel free to submit issues and pull requests to improve the application.
