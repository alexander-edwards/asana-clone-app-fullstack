import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import projectService from '../services/project.service';
import taskService from '../services/task.service';
import TaskBoard from '../components/TaskBoard';
import TaskList from '../components/TaskList';
import {
  PlusIcon,
  ViewGridIcon,
  ViewListIcon,
  FilterIcon,
  UserGroupIcon,
} from '@heroicons/react/outline';
import toast from 'react-hot-toast';

const ProjectView = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [sections, setSections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [viewType, setViewType] = useState('board');
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    section_id: null,
  });

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      const [projectData, sectionsData, tasksData] = await Promise.all([
        projectService.getProject(id),
        projectService.getSections(id),
        taskService.getTasks(id),
      ]);
      setProject(projectData);
      setSections(sectionsData);
      setTasks(tasksData);
      setViewType(projectData.view_type || 'board');
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      const taskData = await taskService.createTask({
        project_id: id,
        ...newTask,
        section_id: selectedSection || newTask.section_id,
      });
      setTasks([...tasks, taskData]);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        section_id: null,
      });
      setShowCreateTask(false);
      setSelectedSection(null);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const updatedTask = await taskService.updateTask(taskId, updates);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updatedTask } : t));
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const createSection = async () => {
    const name = prompt('Enter section name:');
    if (name && name.trim()) {
      try {
        const sectionData = await projectService.createSection(id, name.trim());
        setSections([...sections, sectionData]);
        toast.success('Section created successfully!');
      } catch (error) {
        console.error('Error creating section:', error);
        toast.error('Failed to create section');
      }
    }
  };

  const handleOpenCreateTask = (sectionId = null) => {
    setSelectedSection(sectionId);
    setNewTask({
      ...newTask,
      section_id: sectionId,
    });
    setShowCreateTask(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Project not found</h2>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center mr-3"
              style={{ backgroundColor: project.color + '20' }}
            >
              <div className="h-6 w-6 rounded" style={{ backgroundColor: project.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('board')}
                className={`p-2 rounded ${viewType === 'board' ? 'bg-white shadow-sm' : ''}`}
              >
                <ViewGridIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded ${viewType === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <ViewListIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Members */}
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
              {project.members?.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{project.members.length - 3}
                  </span>
                </div>
              )}
              <button className="h-8 w-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center hover:bg-primary-200">
                <PlusIcon className="h-4 w-4 text-primary-600" />
              </button>
            </div>

            {/* Create Task Button */}
            <button
              onClick={() => handleOpenCreateTask()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewType === 'board' ? (
          <TaskBoard
            sections={sections}
            tasks={tasks}
            onCreateTask={handleOpenCreateTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onCreateSection={createSection}
          />
        ) : (
          <TaskList
            sections={sections}
            tasks={tasks}
            onCreateTask={handleOpenCreateTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateTask(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Create New Task
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Task Title</label>
                    <input
                      type="text"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSection === null && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Section</label>
                      <select
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        value={newTask.section_id || ''}
                        onChange={(e) => setNewTask({ ...newTask, section_id: e.target.value || null })}
                      >
                        <option value="">No section</option>
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={createTask}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Task
                </button>
                <button
                  onClick={() => setShowCreateTask(false)}
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

export default ProjectView;
