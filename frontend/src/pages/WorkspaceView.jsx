import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import workspaceService from '../services/workspace.service';
import projectService from '../services/project.service';
import {
  PlusIcon,
  FolderIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const WorkspaceView = () => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    color: '#6B46C1',
    view_type: 'list',
  });

  const colors = [
    '#6B46C1', '#DC2626', '#059669', '#2563EB', 
    '#F59E0B', '#EC4899', '#8B5CF6', '#10B981'
  ];

  const viewTypes = [
    { value: 'list', label: 'List', icon: ListBulletIcon },
    { value: 'board', label: 'Board', icon: Squares2X2Icon },
    { value: 'timeline', label: 'Timeline', icon: ChartBarIcon },
    { value: 'calendar', label: 'Calendar', icon: CalendarIcon },
  ];

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const fetchWorkspaceData = async () => {
    try {
      const [workspaceData, projectsData] = await Promise.all([
        workspaceService.getWorkspace(id),
        projectService.getProjects(id),
      ]);
      setWorkspace(workspaceData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      toast.error('Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const projectData = await projectService.createProject({
        workspace_id: id,
        ...newProject,
      });
      setProjects([...projects, projectData]);
      setNewProject({
        name: '',
        description: '',
        color: '#6B46C1',
        view_type: 'list',
      });
      setShowCreateProject(false);
      toast.success('Project created successfully!');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const getProjectStats = (project) => {
    const total = project.task_count || 0;
    const completed = project.completed_task_count || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Workspace not found</h2>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
            {workspace.description && (
              <p className="mt-1 text-gray-500">{workspace.description}</p>
            )}
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span>{workspace.member_count || 1} member{(workspace.member_count || 1) !== 1 ? 's' : ''}</span>
              <span className="mx-2">•</span>
              <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <button
              onClick={() => setShowCreateProject(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const stats = getProjectStats(project);
            return (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: project.color + '20' }}
                    >
                      <FolderIcon className="h-6 w-6" style={{ color: project.color }} />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{project.view_type} view</p>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{stats.total} tasks</span>
                      <span>{stats.percentage}% complete</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {project.members?.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="h-8 w-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center"
                          title={member.name}
                        >
                          <span className="text-xs font-medium text-gray-600">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      ))}
                      {project.member_count > 3 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            +{project.member_count - 3}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {project.status || 'active'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateProject(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateProject(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Create New Project
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      placeholder="Enter project description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <div className="mt-2 flex space-x-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewProject({ ...newProject, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newProject.color === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Default View</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {viewTypes.map((view) => (
                        <button
                          key={view.value}
                          type="button"
                          onClick={() => setNewProject({ ...newProject, view_type: view.value })}
                          className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium ${
                            newProject.view_type === view.value
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <view.icon className="h-4 w-4 mr-2" />
                          {view.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createProject}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowCreateProject(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;
