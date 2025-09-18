import React, { useState } from 'react';
import {
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  DotsVerticalIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/solid';
import { format } from 'date-fns';

const TaskCard = ({ task, onUpdate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-50';
      case 'high':
        return 'text-orange-500 bg-orange-50';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const handleToggleComplete = () => {
    onUpdate({
      status: task.status === 'completed' ? 'todo' : 'completed',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1">
          <button
            onClick={handleToggleComplete}
            className="mt-1 mr-3 flex-shrink-0"
          >
            {task.status === 'completed' ? (
              <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
          <div className="flex-1">
            <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <DotsVerticalIcon className="h-4 w-4 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <button
                onClick={() => {
                  setShowMenu(false);
                  // Open edit modal
                }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  if (window.confirm('Are you sure you want to delete this task?')) {
                    onDelete();
                  }
                }}
                className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center space-x-3">
        {/* Priority */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
          <FlagIcon className="h-3 w-3 mr-1" />
          {task.priority}
        </span>

        {/* Due Date */}
        {task.due_date && (
          <span className="inline-flex items-center text-xs text-gray-500">
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
            {task.assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  +{task.assignees.length - 3}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
