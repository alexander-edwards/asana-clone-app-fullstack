const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// Get all sections in a project
router.get('/project/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

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

    const sections = await pool.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM tasks WHERE section_id = s.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE section_id = s.id AND status = 'completed') as completed_task_count
       FROM sections s
       WHERE s.project_id = $1
       ORDER BY s.position`,
      [projectId]
    );

    res.json(sections.rows);
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create section
router.post('/', authMiddleware, [
  body('project_id').notEmpty(),
  body('name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { project_id, name } = req.body;

    // Check if user has access to project
    const accessCheck = await pool.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [project_id, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the next position
    const maxPosition = await pool.query(
      'SELECT MAX(position) as max_pos FROM sections WHERE project_id = $1',
      [project_id]
    );
    const position = (maxPosition.rows[0].max_pos || 0) + 1;

    const section = await pool.query(
      'INSERT INTO sections (project_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [project_id, name, position]
    );

    res.status(201).json(section.rows[0]);
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update section
router.put('/:id', authMiddleware, [
  body('name').optional().notEmpty().trim(),
  body('position').optional().isInt({ min: 0 })
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, position } = req.body;

    // Check if section exists and get project_id
    const sectionCheck = await client.query(
      'SELECT project_id, position as current_position FROM sections WHERE id = $1',
      [id]
    );

    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const projectId = sectionCheck.rows[0].project_id;
    const currentPosition = sectionCheck.rows[0].current_position;

    // Check if user has access to project
    const accessCheck = await client.query(
      `SELECT 1 FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id
       LEFT JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR wm.user_id = $2)`,
      [projectId, req.userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await client.query('BEGIN');

    // Handle position change
    if (position !== undefined && position !== currentPosition) {
      // Get all sections in the project
      const sections = await client.query(
        'SELECT id, position FROM sections WHERE project_id = $1 AND id != $2 ORDER BY position',
        [projectId, id]
      );

      // Reorder sections
      if (position < currentPosition) {
        // Moving up
        await client.query(
          'UPDATE sections SET position = position + 1 WHERE project_id = $1 AND position >= $2 AND position < $3',
          [projectId, position, currentPosition]
        );
      } else {
        // Moving down
        await client.query(
          'UPDATE sections SET position = position - 1 WHERE project_id = $1 AND position > $2 AND position <= $3',
          [projectId, currentPosition, position]
        );
      }
    }

    // Update the section
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(position);
      paramCount++;
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE sections 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } else {
      await client.query('COMMIT');
      res.json(sectionCheck.rows[0]);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update section error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete section
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { moveTasks } = req.query; // 'delete' or section_id to move tasks to

    // Check if section exists and get project_id
    const sectionCheck = await client.query(
      'SELECT project_id FROM sections WHERE id = $1',
      [id]
    );

    if (sectionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const projectId = sectionCheck.rows[0].project_id;

    // Check if user has admin access to project
    const adminCheck = await client.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, req.userId]
    );

    const ownerCheck = await client.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, req.userId]
    );

    if ((adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') && ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only project admins can delete sections' });
    }

    await client.query('BEGIN');

    // Handle tasks in the section
    if (moveTasks === 'delete') {
      // Delete all tasks in the section
      await client.query('DELETE FROM tasks WHERE section_id = $1', [id]);
    } else if (moveTasks) {
      // Move tasks to another section
      await client.query(
        'UPDATE tasks SET section_id = $1 WHERE section_id = $2',
        [moveTasks, id]
      );
    } else {
      // Move tasks to no section (null)
      await client.query(
        'UPDATE tasks SET section_id = NULL WHERE section_id = $1',
        [id]
      );
    }

    // Delete the section
    await client.query('DELETE FROM sections WHERE id = $1', [id]);

    // Reorder remaining sections
    await client.query(
      'UPDATE sections SET position = position - 1 WHERE project_id = $1 AND position > (SELECT position FROM sections WHERE id = $2)',
      [projectId, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
