const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all tasks in a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { section_id, status, assignee_id, search } = req.query;

    // Check if user has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT t.*, 
        u.name as creator_name,
        s.name as section_name,
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', au.id,
              'name', au.name,
              'email', au.email,
              'avatar_url', au.avatar_url
            )
          ) FROM task_assignees ta 
          JOIN users au ON ta.user_id = au.id 
          WHERE ta.task_id = t.id
          ), '[]'
        ) as assignees,
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', dt.id,
              'title', dt.title
            )
          ) FROM task_dependencies td
          JOIN tasks dt ON td.depends_on_task_id = dt.id
          WHERE td.task_id = t.id
          ), '[]'
        ) as dependencies
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN sections s ON t.section_id = s.id
      WHERE t.project_id = $1
    `;

    const params = [projectId];
    let paramCount = 2;

    if (section_id) {
      query += ` AND t.section_id = $${paramCount}`;
      params.push(section_id);
      paramCount++;
    }

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (assignee_id) {
      query += ` AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = $${paramCount})`;
      params.push(assignee_id);
      paramCount++;
    }

    if (search) {
      query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY t.position, t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single task
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await pool.query(
      `SELECT t.*, 
        u.name as creator_name,
        s.name as section_name,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN sections s ON t.section_id = s.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1`,
      [id]
    );

    if (task.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to project
    const projectId = task.rows[0].project_id;
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get assignees
    const assignees = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, ta.assigned_at
       FROM task_assignees ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = $1`,
      [id]
    );

    // Get comments count
    const commentsCount = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE task_id = $1',
      [id]
    );

    // Get attachments
    const attachments = await pool.query(
      'SELECT * FROM attachments WHERE task_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get dependencies
    const dependencies = await pool.query(
      `SELECT dt.id, dt.title, dt.status
       FROM task_dependencies td
       JOIN tasks dt ON td.depends_on_task_id = dt.id
       WHERE td.task_id = $1`,
      [id]
    );

    const result = {
      ...task.rows[0],
      assignees: assignees.rows,
      comments_count: parseInt(commentsCount.rows[0].count),
      attachments: attachments.rows,
      dependencies: dependencies.rows
    };

    res.json(result);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', authMiddleware, [
  body('project_id').notEmpty(),
  body('title').notEmpty().trim(),
  body('description').optional().trim(),
  body('section_id').optional(),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('due_date').optional().isISO8601(),
  body('start_date').optional().isISO8601(),
  body('tags').optional().isArray(),
  body('assignee_ids').optional().isArray()
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      project_id,
      section_id,
      title,
      description,
      status = 'todo',
      priority = 'medium',
      due_date,
      start_date,
      tags = [],
      assignee_ids = [],
      custom_fields = {}
    } = req.body;

    // Check if user has access to project
    const accessCheck = await client.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [project_id, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to project' });
    }

    await client.query('BEGIN');

    // Get the next position
    let position = 0;
    if (section_id) {
      const maxPosition = await client.query(
        'SELECT MAX(position) as max_pos FROM tasks WHERE section_id = $1',
        [section_id]
      );
      position = (maxPosition.rows[0].max_pos || 0) + 1;
    } else {
      const maxPosition = await client.query(
        'SELECT MAX(position) as max_pos FROM tasks WHERE project_id = $1 AND section_id IS NULL',
        [project_id]
      );
      position = (maxPosition.rows[0].max_pos || 0) + 1;
    }

    // Create task
    const task = await client.query(
      `INSERT INTO tasks (
        project_id, section_id, title, description, status, priority,
        due_date, start_date, creator_id, position, tags, custom_fields
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        project_id, section_id, title, description, status, priority,
        due_date, start_date, req.userId, position, tags, custom_fields
      ]
    );

    // Add assignees
    for (const assigneeId of assignee_ids) {
      await client.query(
        'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
        [task.rows[0].id, assigneeId]
      );
    }

    await client.query('COMMIT');

    // Get complete task data
    const completeTask = await pool.query(
      `SELECT t.*, 
        u.name as creator_name,
        s.name as section_name
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN sections s ON t.section_id = s.id
      WHERE t.id = $1`,
      [task.rows[0].id]
    );

    res.status(201).json(completeTask.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Update task
router.put('/:id', authMiddleware, [
  body('title').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'completed', 'blocked']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('due_date').optional(),
  body('start_date').optional(),
  body('section_id').optional(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateFields = req.body;

    // Get task to check access
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user has access to project
    const projectId = taskCheck.rows[0].project_id;
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    // Handle special case for completed status
    if (updateFields.status === 'completed' && updateFields.status !== taskCheck.rows[0].status) {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    } else if (updateFields.status && updateFields.status !== 'completed') {
      updates.push(`completed_at = NULL`);
    }

    // Build update query
    const fieldsToUpdate = ['title', 'description', 'status', 'priority', 'due_date', 'start_date', 'section_id', 'tags', 'custom_fields', 'position'];
    
    fieldsToUpdate.forEach(field => {
      if (updateFields[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(updateFields[field]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Get complete task data
    const completeTask = await pool.query(
      `SELECT t.*, 
        u.name as creator_name,
        s.name as section_name,
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', au.id,
              'name', au.name,
              'email', au.email,
              'avatar_url', au.avatar_url
            )
          ) FROM task_assignees ta 
          JOIN users au ON ta.user_id = au.id 
          WHERE ta.task_id = t.id
          ), '[]'
        ) as assignees
      FROM tasks t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN sections s ON t.section_id = s.id
      WHERE t.id = $1`,
      [id]
    );

    res.json(completeTask.rows[0]);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get task to check access
    const taskCheck = await pool.query(
      'SELECT project_id, creator_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is creator or has project admin access
    const projectId = taskCheck.rows[0].project_id;
    const isCreator = taskCheck.rows[0].creator_id === req.userId;

    const adminCheck = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.userId]
    );

    if (!isCreator && (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin')) {
      return res.status(403).json({ error: 'Only task creator or project admin can delete' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add assignee to task
router.post('/:id/assignees', authMiddleware, [
  body('user_id').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { user_id } = req.body;

    // Check if task exists and user has access
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already assigned
    const assigneeCheck = await pool.query(
      'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [id, user_id]
    );

    if (assigneeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already assigned to task' });
    }

    // Add assignee
    await pool.query(
      'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
      [id, user_id]
    );

    res.status(201).json({ message: 'Assignee added successfully' });
  } catch (error) {
    console.error('Add assignee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove assignee from task
router.delete('/:id/assignees/:userId', authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if task exists and user has access
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskCheck.rows[0].project_id;
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query(
      'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Assignee removed successfully' });
  } catch (error) {
    console.error('Remove assignee error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
