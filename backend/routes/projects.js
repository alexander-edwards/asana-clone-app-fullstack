const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all projects in a workspace
router.get('/workspace/:workspaceId', authMiddleware, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Check if user has access to workspace
    const accessCheck = await pool.query(
      'SELECT 1 FROM workspaces w LEFT JOIN workspace_members wm ON w.id = wm.workspace_id WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)',
      [workspaceId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = `
      SELECT p.*, 
        u.name as owner_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'completed') as completed_task_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.workspace_id = $1
      ORDER BY p.created_at DESC
    `;

    const result = await pool.query(query, [workspaceId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [id, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const project = await pool.query(
      `SELECT p.*, u.name as owner_name, w.name as workspace_name
       FROM projects p 
       JOIN users u ON p.owner_id = u.id
       JOIN workspaces w ON p.workspace_id = w.id
       WHERE p.id = $1`,
      [id]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get members
    const members = await pool.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [id]
    );

    // Get sections
    const sections = await pool.query(
      'SELECT * FROM sections WHERE project_id = $1 ORDER BY position',
      [id]
    );

    const result = {
      ...project.rows[0],
      members: members.rows,
      sections: sections.rows
    };

    res.json(result);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
router.post('/', authMiddleware, [
  body('workspace_id').notEmpty(),
  body('name').notEmpty().trim(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('icon').optional().trim(),
  body('start_date').optional().isISO8601(),
  body('due_date').optional().isISO8601(),
  body('view_type').optional().isIn(['list', 'board', 'timeline', 'calendar'])
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      workspace_id, 
      name, 
      description, 
      color = '#6B46C1',
      icon,
      start_date,
      due_date,
      view_type = 'list'
    } = req.body;

    // Check if user has access to workspace
    const accessCheck = await client.query(
      'SELECT 1 FROM workspaces w LEFT JOIN workspace_members wm ON w.id = wm.workspace_id WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)',
      [workspace_id, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    await client.query('BEGIN');

    // Create project
    const project = await client.query(
      `INSERT INTO projects (workspace_id, name, description, color, icon, status, view_type, owner_id, start_date, due_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [workspace_id, name, description, color, icon, 'active', view_type, req.userId, start_date, due_date]
    );

    // Add owner as admin member
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.rows[0].id, req.userId, 'admin']
    );

    // Create default sections
    const defaultSections = ['To Do', 'In Progress', 'Done'];
    for (let i = 0; i < defaultSections.length; i++) {
      await client.query(
        'INSERT INTO sections (project_id, name, position) VALUES ($1, $2, $3)',
        [project.rows[0].id, defaultSections[i], i]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(project.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Update project
router.put('/:id', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i),
  body('icon').optional().trim(),
  body('status').optional().isIn(['active', 'archived', 'on_hold']),
  body('view_type').optional().isIn(['list', 'board', 'timeline', 'calendar']),
  body('start_date').optional().isISO8601(),
  body('due_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateFields = req.body;

    // Check if user is project admin
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    const ownerCheck = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if ((adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') && ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only project admins can update' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(updateFields[key]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only project owner can delete' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to project
router.post('/:id/members', authMiddleware, [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { email, role = 'member' } = req.body;

    // Check if requester is admin
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    const ownerCheck = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if ((adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') && ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newUserId = userResult.rows[0].id;

    // Check if already member
    const memberCheck = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, newUserId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    const result = await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [id, newUserId, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from project
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if requester is admin
    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    const ownerCheck = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if ((adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') && ownerCheck.rows.length === 0) {
      // Allow users to remove themselves
      if (userId !== req.userId) {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }
    }

    // Cannot remove owner
    if (ownerCheck.rows.length > 0 && userId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove project owner' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
