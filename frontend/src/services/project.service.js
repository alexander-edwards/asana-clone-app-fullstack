import api from './api';

class ProjectService {
  async getProjects(workspaceId) {
    const response = await api.get(`/projects/workspace/${workspaceId}`);
    return response.data;
  }

  async getProject(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data) {
    const response = await api.post('/projects', data);
    return response.data;
  }

  async updateProject(id, data) {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }

  async addMember(projectId, email, role = 'member') {
    const response = await api.post(`/projects/${projectId}/members`, {
      email,
      role
    });
    return response.data;
  }

  async removeMember(projectId, userId) {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  }

  async getSections(projectId) {
    const response = await api.get(`/sections/project/${projectId}`);
    return response.data;
  }

  async createSection(projectId, name) {
    const response = await api.post('/sections', {
      project_id: projectId,
      name
    });
    return response.data;
  }

  async updateSection(id, data) {
    const response = await api.put(`/sections/${id}`, data);
    return response.data;
  }

  async deleteSection(id) {
    const response = await api.delete(`/sections/${id}`);
    return response.data;
  }
}

export default new ProjectService();
