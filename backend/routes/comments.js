const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all comments for a task
router.get('/task/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Check if task exists and user has access
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [taskId]
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

    const comments = await pool.query(
      `SELECT c.*, 
        u.name as user_name, 
        u.email as user_email, 
        u.avatar_url as user_avatar,
        (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.task_id = $1 AND c.parent_id IS NULL
       ORDER BY c.created_at DESC`,
      [taskId]
    );

    // Get replies for each comment
    for (let comment of comments.rows) {
      const replies = await pool.query(
        `SELECT c.*, 
          u.name as user_name, 
          u.email as user_email, 
          u.avatar_url as user_avatar
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = $1
         ORDER BY c.created_at ASC`,
        [comment.id]
      );
      comment.replies = replies.rows;
    }

    res.json(comments.rows);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create comment
router.post('/', authMiddleware, [
  body('task_id').notEmpty(),
  body('content').notEmpty().trim(),
  body('parent_id').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { task_id, content, parent_id } = req.body;

    // Check if task exists and user has access
    const taskCheck = await pool.query(
      'SELECT project_id FROM tasks WHERE id = $1',
      [task_id]
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

    // If parent_id provided, check it exists and belongs to same task
    if (parent_id) {
      const parentCheck = await pool.query(
        'SELECT 1 FROM comments WHERE id = $1 AND task_id = $2',
        [parent_id, task_id]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
    }

    const comment = await pool.query(
      'INSERT INTO comments (task_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [task_id, req.userId, content, parent_id]
    );

    // Get complete comment data
    const completeComment = await pool.query(
      `SELECT c.*, 
        u.name as user_name, 
        u.email as user_email, 
        u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [comment.rows[0].id]
    );

    res.status(201).json(completeComment.rows[0]);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update comment
router.put('/:id', authMiddleware, [
  body('content').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Check if comment exists and user is owner
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Only comment owner can update' });
    }

    const result = await pool.query(
      'UPDATE comments SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content, id]
    );

    // Get complete comment data
    const completeComment = await pool.query(
      `SELECT c.*, 
        u.name as user_name, 
        u.email as user_email, 
        u.avatar_url as user_avatar
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    res.json(completeComment.rows[0]);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists and user is owner
    const commentCheck = await pool.query(
      'SELECT user_id, task_id FROM comments WHERE id = $1',
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const taskId = commentCheck.rows[0].task_id;
    const isOwner = commentCheck.rows[0].user_id === req.userId;

    // Check if user is project admin if not owner
    if (!isOwner) {
      const taskCheck = await pool.query(
        'SELECT project_id FROM tasks WHERE id = $1',
        [taskId]
      );

      const projectId = taskCheck.rows[0].project_id;
      const adminCheck = await pool.query(
        'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, req.userId]
      );

      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ error: 'Only comment owner or project admin can delete' });
      }
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
