const pool = require('../config/db.config');

class Policy {
  static async create({ title, description, category, iso_clause, classification, status, documentPath }) {
    const query = `
      INSERT INTO policies (title, description, category, iso_clause, classification, status, document_path)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_policy, title, description, category, iso_clause, classification, status, upload_date, document_path, created_at;
    `;
    const values = [title, description, category, iso_clause, classification, status, documentPath];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findPoliciesWithReadStatus(userId, searchTerm, categoryFilter, statusFilter) {
    let query = `
      SELECT
        p.id_policy,
        p.title,
        p.description,
        p.category,
        p.iso_clause,
        p.classification,
        p.status,
        p.upload_date,
        p.document_path,
        p.created_at,
        p.updated_at,
        prs.read_date IS NOT NULL AS is_read,
        prs.read_date
      FROM policies p
      LEFT JOIN policy_read_status prs ON p.id_policy = prs.policy_id AND prs.user_id = $1
      WHERE TRUE
    `;
    const values = [userId];
    let paramIndex = 2; 
    if (searchTerm) {
      query += ` AND (LOWER(p.title) LIKE $${paramIndex} OR LOWER(p.description) LIKE $${paramIndex})`;
      values.push(`%${searchTerm.toLowerCase()}%`);
      paramIndex++;
    }

    if (categoryFilter && categoryFilter !== 'Todas') {
      query += ` AND p.category = $${paramIndex}`;
      values.push(categoryFilter);
      paramIndex++;
    }

    if (statusFilter && statusFilter !== 'Todos') {
      query += ` AND p.status = $${paramIndex}`;
      values.push(statusFilter);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC;`;

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async findAll(searchTerm, categoryFilter, statusFilter) {
    let query = `
      SELECT id_policy, title, description, category, iso_clause, classification, status, upload_date, document_path, created_at
      FROM policies
      WHERE TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (LOWER(title) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`;
      values.push(`%${searchTerm.toLowerCase()}%`);
      paramIndex++;
    }

    if (categoryFilter && categoryFilter !== 'Todas') {
      query += ` AND category = $${paramIndex}`;
      values.push(categoryFilter);
      paramIndex++;
    }

    if (statusFilter && statusFilter !== 'Todos') {
      query += ` AND status = $${paramIndex}`;
      values.push(statusFilter);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC;`;

    const { rows } = await pool.query(query, values);
    return rows;
  }

   static async markAsRead(userId, policyId) {
    const query = `
      INSERT INTO policy_read_status (user_id, policy_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, policy_id) DO UPDATE SET read_date = CURRENT_TIMESTAMP
      RETURNING id_read_status, user_id, policy_id, read_date;
    `;
    const values = [userId, policyId];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT id_policy, title, description, category, iso_clause, classification, status, upload_date, document_path, created_at
      FROM policies
      WHERE id_policy = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async update(id, { title, description, category, iso_clause, classification, status, documentPath }) {
    const query = `
      UPDATE policies
      SET
        title = $1,
        description = $2,
        category = $3,
        iso_clause = $4,
        classification = $5,
        status = $6,
        document_path = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_policy = $8
      RETURNING id_policy, title, description, category, iso_clause, classification, status, upload_date, document_path, created_at, updated_at;
    `;
    const values = [title, description, category, iso_clause, classification, status, documentPath, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM policies
      WHERE id_policy = $1
      RETURNING document_path;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? rows[0].document_path : null;
  }
}

module.exports = Policy;