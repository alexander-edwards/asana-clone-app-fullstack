import React from 'react';
import TaskCard from './TaskCard';
import { PlusIcon } from '@heroicons/react/outline';

const TaskBoard = ({ sections, tasks, onCreateTask, onUpdateTask, onDeleteTask, onCreateSection }) => {
  const getTasksForSection = (sectionId) => {
    return tasks.filter(task => task.section_id === sectionId);
  };

  const getUnassignedTasks = () => {
    return tasks.filter(task => !task.section_id);
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, sectionId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      await onUpdateTask(taskId, { section_id: sectionId });
    }
  };

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className="h-full inline-flex space-x-4 p-6" style={{ minWidth: 'max-content' }}>
        {/* Unassigned Tasks Column */}
        {getUnassignedTasks().length > 0 && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-gray-50 rounded-lg h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">No Section</h3>
                <p className="text-sm text-gray-500 mt-1">{getUnassignedTasks().length} tasks</p>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
              >
                {getUnassignedTasks().map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    className="cursor-move"
                  >
                    <TaskCard
                      task={task}
                      onUpdate={(updates) => onUpdateTask(task.id, updates)}
                      onDelete={() => onDeleteTask(task.id)}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => onCreateTask(null)}
                className="w-full p-3 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add task
              </button>
            </div>
          </div>
        )}

        {/* Section Columns */}
        {sections.map((section) => {
          const sectionTasks = getTasksForSection(section.id);
          return (
            <div key={section.id} className="w-80 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">{section.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{sectionTasks.length} tasks</p>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, section.id)}
                  style={{ minHeight: '200px' }}
                >
                  {sectionTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      className="cursor-move"
                    >
                      <TaskCard
                        task={task}
                        onUpdate={(updates) => onUpdateTask(task.id, updates)}
                        onDelete={() => onDeleteTask(task.id)}
                      />
                    </div>
                  ))}
                  {sectionTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">Drop tasks here</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onCreateTask(section.id)}
                  className="w-full p-3 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add task
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Section Button */}
        <div className="w-80 flex-shrink-0">
          <button
            onClick={onCreateSection}
            className="w-full h-full min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 flex flex-col items-center justify-center text-gray-500"
          >
            <PlusIcon className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">Add Section</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;
