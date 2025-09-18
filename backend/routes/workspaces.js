const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all workspaces for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT w.*, 
        u.name as owner_name,
        wm.role as user_role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count
      FROM workspaces w
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      LEFT JOIN users u ON w.owner_id = u.id
      WHERE w.owner_id = $1 OR wm.user_id = $1
      ORDER BY w.created_at DESC
    `;
    
    const result = await pool.query(query, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single workspace
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has access
    const accessCheck = await pool.query(
      'SELECT 1 FROM workspaces w LEFT JOIN workspace_members wm ON w.id = wm.workspace_id WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)',
      [id, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const workspace = await pool.query(
      'SELECT w.*, u.name as owner_name FROM workspaces w JOIN users u ON w.owner_id = u.id WHERE w.id = $1',
      [id]
    );

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Get members
    const members = await pool.query(
      `SELECT u.id, u.email, u.name, u.avatar_url, wm.role, wm.joined_at
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1`,
      [id]
    );

    const result = {
      ...workspace.rows[0],
      members: members.rows
    };

    res.json(result);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workspace
router.post('/', authMiddleware, [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  const client = await pool.connect();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    await client.query('BEGIN');

    // Create workspace
    const workspace = await client.query(
      'INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.userId]
    );

    // Add owner as admin member
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [workspace.rows[0].id, req.userId, 'admin']
    );

    await client.query('COMMIT');

    res.status(201).json(workspace.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Update workspace
router.put('/:id', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only workspace owner can update' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE workspaces 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete workspace
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const ownerCheck = await pool.query(
      'SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only workspace owner can delete' });
    }

    await pool.query('DELETE FROM workspaces WHERE id = $1', [id]);
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add member to workspace
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
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    const ownerCheck = await pool.query(
      'SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (adminCheck.rows.length === 0 || (adminCheck.rows[0].role !== 'admin' && ownerCheck.rows.length === 0)) {
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
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, newUserId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Add member
    const result = await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [id, newUserId, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from workspace
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if requester is admin
    const adminCheck = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, req.userId]
    );

    const ownerCheck = await pool.query(
      'SELECT 1 FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (adminCheck.rows.length === 0 || (adminCheck.rows[0].role !== 'admin' && ownerCheck.rows.length === 0)) {
      // Allow users to remove themselves
      if (userId !== req.userId) {
        return res.status(403).json({ error: 'Only admins can remove members' });
      }
    }

    // Cannot remove owner
    if (ownerCheck.rows.length > 0 && userId === req.userId) {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    await pool.query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
