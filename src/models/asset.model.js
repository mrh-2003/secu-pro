const pool = require('../config/db.config');

class Asset {
  static async create({ name, type, category, description, criticality, documentPath }) {
    const query = `
      INSERT INTO assets (name, type, category, description, criticality, document_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_asset, name, type, category, description, criticality, upload_date, document_path, created_at;
    `;
    const values = [name, type, category, description, criticality, documentPath];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(searchTerm, categoryFilter) {
    let query = `
      SELECT id_asset, name, type, category, description, criticality, upload_date, document_path, created_at
      FROM assets
      WHERE TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(type) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`;
      values.push(`%${searchTerm.toLowerCase()}%`);
      paramIndex++;
    }

    if (categoryFilter && categoryFilter !== 'Todos') {
      query += ` AND category = $${paramIndex}`;
      values.push(categoryFilter);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC;`;

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT id_asset, name, type, category, description, criticality, upload_date, document_path, created_at
      FROM assets
      WHERE id_asset = $1;
    `;
    
    const { rows } = await pool.query(query, [id]); 
    return rows[0];
  }

  static async update(id, { name, type, category, description, criticality, documentPath }) {
    const query = `
      UPDATE assets
      SET
        name = $1,
        type = $2,
        category = $3,
        description = $4,
        criticality = $5,
        document_path = $6
      WHERE id_asset = $7
      RETURNING id_asset, name, type, category, description, criticality, upload_date, document_path, created_at;
    `;
    const values = [name, type, category, description, criticality, documentPath, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM assets
      WHERE id_asset = $1
      RETURNING document_path;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? rows[0].document_path : null;
  }

  static async findAssignedDocuments(userId) {
    const query = `
      SELECT
        u.name AS user_name,
        u.position,
        a.id_asset,
        a.name AS asset_name,
        a.type AS document_type,
        ap.assigned_date,
        a.document_path
      FROM users u
      JOIN access_permissions ap ON u.id_user = ap.user_id
      JOIN assets a ON ap.asset_id = a.id_asset
      WHERE u.id_user = $1
      ORDER BY ap.assigned_date DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
}

module.exports = Asset;