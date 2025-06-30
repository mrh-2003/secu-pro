const pool = require('../config/db.config');

class Incident {
  static async create({ incident_type, description, priority, possible_causes, additional_message, evidence, assigned_to }) {
    const query = `
      INSERT INTO incidents (incident_type, description, priority, possible_causes, additional_message, evidence, assigned_to, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Abierto')
      RETURNING id_incident, incident_type, description, priority, possible_causes, additional_message, evidence, status, assigned_to, created_at;
    `;
    const values = [incident_type, description, priority, possible_causes, additional_message, evidence, assigned_to];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(searchTerm, statusFilter) {
    let query = `
      SELECT
        i.id_incident,
        i.incident_type,
        i.description,
        i.priority,
        i.status,
        i.assigned_to,
        u.name AS assigned_to_name,
        i.created_at,
        i.evidence
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.id_user
      WHERE TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (searchTerm) {
      query += ` AND (LOWER(i.incident_type) LIKE $${paramIndex} OR LOWER(i.description) LIKE $${paramIndex})`;
      values.push(`%${searchTerm.toLowerCase()}%`);
      paramIndex++;
    }

    if (statusFilter && statusFilter !== 'Todos') {
      query += ` AND i.status = $${paramIndex}`;
      values.push(statusFilter);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC;`;

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT
        i.id_incident,
        i.incident_type,
        i.description,
        i.priority,
        i.possible_causes,
        i.additional_message,
        i.evidence,
        i.status,
        i.assigned_to,
        u.name AS assigned_to_name,
        i.created_at,
        i.solution,
        i.help_links,
        i.help_documents,
        i.resolved_at
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.id_user
      WHERE i.id_incident = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async updateSolution(id, { solution, help_links, help_documents, assigned_to, status }) {
    let query = `
      UPDATE incidents
      SET
        solution = $1,
        help_links = $2,
        help_documents = $3,
        assigned_to = $4,
        status = $5::varchar,
        resolved_at = CASE WHEN $5 = 'Cerrado' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id_incident = $6
      RETURNING *;
    `; 
    
    const values = [solution, help_links, help_documents, assigned_to, status, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
 

  static async delete(id) {
    const query = `
      DELETE FROM incidents
      WHERE id_incident = $1
      RETURNING evidence, help_documents;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];  
  }
}

module.exports = Incident;