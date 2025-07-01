const pool = require('../config/db.config');

class Audit {
  static async create({ title, description, scheduled_date, assigned_auditor }) {
    const query = `
      INSERT INTO audits (title, description, scheduled_date, assigned_auditor, status)
      VALUES ($1, $2, $3, $4, 'Pendiente')
      RETURNING id_audit, title, description, scheduled_date, assigned_auditor, status, created_at;
    `;
    const values = [title, description, scheduled_date, assigned_auditor];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAll(statusFilter) {
    let query = `
      SELECT id_audit, title, description, scheduled_date, assigned_auditor, status, final_report_path, created_at, updated_at
      FROM audits
      WHERE TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (statusFilter && statusFilter !== 'Todas') {
      query += ` AND status = $${paramIndex}`;
      values.push(statusFilter);
      paramIndex++;
    }

    query += ` ORDER BY scheduled_date DESC, created_at DESC;`;

    const { rows } = await pool.query(query, values);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT id_audit, title, description, scheduled_date, assigned_auditor, status, final_report_path, created_at, updated_at
      FROM audits
      WHERE id_audit = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async update(id, { title, description, scheduled_date, assigned_auditor, status, final_report_path }) {
    const query = `
      UPDATE audits
      SET
        title = $1,
        description = $2,
        scheduled_date = $3,
        assigned_auditor = $4,
        status = $5,
        final_report_path = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_audit = $7
      RETURNING id_audit, title, description, scheduled_date, assigned_auditor, status, final_report_path, created_at, updated_at;
    `;
    const values = [title, description, scheduled_date, assigned_auditor, status, final_report_path, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async delete(id) { 
    await pool.query('DELETE FROM audit_policy_evaluations WHERE audit_id = $1;', [id]);

    const query = `
      DELETE FROM audits
      WHERE id_audit = $1
      RETURNING final_report_path;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? rows[0].final_report_path : null;
  }
  
  static async getEvaluatedPolicies(auditId) {
    const query = `
      SELECT
        ape.id_evaluation,
        ape.is_compliant,
        ape.observations,
        ape.evaluated_at,
        p.id_policy,
        p.title AS policy_title,
        p.iso_clause,
        p.status AS policy_status
      FROM audit_policy_evaluations ape
      JOIN policies p ON ape.policy_id = p.id_policy
      WHERE ape.audit_id = $1
      ORDER BY p.title;
    `;
    const { rows } = await pool.query(query, [auditId]);
    return rows;
  }

  static async saveEvaluations(auditId, evaluations) { 
    await pool.query('DELETE FROM audit_policy_evaluations WHERE audit_id = $1;', [auditId]);

    const insertPromises = evaluations.map(evalItem => {
      const query = `
        INSERT INTO audit_policy_evaluations (audit_id, policy_id, is_compliant, observations)
        VALUES ($1, $2, $3, $4);
      `;
      const values = [auditId, evalItem.policy_id, evalItem.is_compliant, evalItem.observations];
      return pool.query(query, values);
    });
    await Promise.all(insertPromises);
    return true;
  }
}

module.exports = Audit;