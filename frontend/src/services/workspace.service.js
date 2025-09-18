import api from './api';

class WorkspaceService {
  async getWorkspaces() {
    const response = await api.get('/workspaces');
    return response.data;
  }

  async getWorkspace(id) {
    const response = await api.get(`/workspaces/${id}`);
    return response.data;
  }

  async createWorkspace(data) {
    const response = await api.post('/workspaces', data);
    return response.data;
  }

  async updateWorkspace(id, data) {
    const response = await api.put(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id) {
    const response = await api.delete(`/workspaces/${id}`);
    return response.data;
  }

  async addMember(workspaceId, email, role = 'member') {
    const response = await api.post(`/workspaces/${workspaceId}/members`, {
      email,
      role
    });
    return response.data;
  }

  async removeMember(workspaceId, userId) {
    const response = await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  }
}

export default new WorkspaceService();
