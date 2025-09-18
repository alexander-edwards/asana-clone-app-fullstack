import React from 'react';
import {
  CheckCircleIcon,
  CalendarIcon,
  FlagIcon,
  PlusIcon,
} from '@heroicons/react/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/solid';
import { format } from 'date-fns';

const TaskList = ({ sections, tasks, onCreateTask, onUpdateTask, onDeleteTask }) => {
  const getTasksForSection = (sectionId) => {
    return tasks.filter(task => task.section_id === sectionId);
  };

  const getUnassignedTasks = () => {
    return tasks.filter(task => !task.section_id);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const TaskRow = ({ task }) => (
    <div className="group flex items-center px-6 py-3 hover:bg-gray-50 border-b border-gray-100">
      <button
        onClick={() => onUpdateTask(task.id, {
          status: task.status === 'completed' ? 'todo' : 'completed'
        })}
        className="mr-3"
      >
        {task.status === 'completed' ? (
          <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.title}
          </span>
          {task.description && (
            <span className="ml-2 text-sm text-gray-500 truncate">
              · {task.description}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Priority */}
        <span className={`flex items-center text-xs ${getPriorityColor(task.priority)}`}>
          <FlagIcon className="h-3 w-3 mr-1" />
          {task.priority}
        </span>

        {/* Due Date */}
        {task.due_date && (
          <span className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1">
            {task.assignees.slice(0, 3).map((assignee, idx) => (
              <div
                key={idx}
                className="h-6 w-6 rounded-full bg-gray-300 border border-white flex items-center justify-center"
                title={assignee.name}
              >
                <span className="text-xs font-medium text-gray-600">
                  {assignee.name.charAt(0).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Delete button (shown on hover) */}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this task?')) {
              onDeleteTask(task.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="divide-y divide-gray-200">
        {/* Unassigned Tasks */}
        {getUnassignedTasks().length > 0 && (
          <div>
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">No Section</h3>
            </div>
            {getUnassignedTasks().map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
            <button
              onClick={() => onCreateTask(null)}
              className="w-full px-6 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add task
            </button>
          </div>
        )}

        {/* Sections with Tasks */}
        {sections.map((section) => {
          const sectionTasks = getTasksForSection(section.id);
          return (
            <div key={section.id}>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {section.name}
                  <span className="ml-2 text-xs text-gray-500">({sectionTasks.length})</span>
                </h3>
              </div>
              {sectionTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
              <button
                onClick={() => onCreateTask(section.id)}
                className="w-full px-6 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add task to {section.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;
