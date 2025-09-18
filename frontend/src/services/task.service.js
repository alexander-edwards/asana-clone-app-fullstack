import api from './api';

class TaskService {
  async getTasks(projectId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/tasks/project/${projectId}${params ? '?' + params : ''}`);
    return response.data;
  }

  async getTask(id) {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  }

  async createTask(data) {
    const response = await api.post('/tasks', data);
    return response.data;
  }

  async updateTask(id, data) {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  }

  async deleteTask(id) {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }

  async addAssignee(taskId, userId) {
    const response = await api.post(`/tasks/${taskId}/assignees`, {
      user_id: userId
    });
    return response.data;
  }

  async removeAssignee(taskId, userId) {
    const response = await api.delete(`/tasks/${taskId}/assignees/${userId}`);
    return response.data;
  }

  async getComments(taskId) {
    const response = await api.get(`/comments/task/${taskId}`);
    return response.data;
  }

  async createComment(taskId, content, parentId = null) {
    const response = await api.post('/comments', {
      task_id: taskId,
      content,
      parent_id: parentId
    });
    return response.data;
  }

  async updateComment(id, content) {
    const response = await api.put(`/comments/${id}`, { content });
    return response.data;
  }

  async deleteComment(id) {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  }
}

export default new TaskService();
