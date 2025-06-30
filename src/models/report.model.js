const pool = require('../config/db.config');

class Report {
  static async getAccessReport(startDate, endDate) {
    const query = `
      SELECT
        u.name AS employee_name,
        a.name AS asset_name,
        ap.assigned_date,
        u.position -- Incluir la posición del usuario
      FROM access_permissions ap
      JOIN users u ON ap.user_id = u.id_user
      JOIN assets a ON ap.asset_id = a.id_asset
      WHERE ap.assigned_date BETWEEN $1 AND $2
      ORDER BY ap.assigned_date DESC;
    `;
    const { rows } = await pool.query(query, [startDate, endDate]);
    return rows;
  }

  static async getIncidentsReport(startDate, endDate) {
    const query = `
      SELECT
        id_incident,
        incident_type,
        description,
        priority,
        status,
        created_at,
        u.name AS assigned_to_name
      FROM incidents i
      LEFT JOIN users u ON i.assigned_to = u.id_user
      WHERE i.created_at BETWEEN $1 AND $2
      ORDER BY i.created_at DESC;
    `;
    const { rows } = await pool.query(query, [startDate, endDate]); 
    const totalIncidents = rows.length;
    const openIncidents = rows.filter(r => r.status === 'Abierto').length;
    const closedIncidents = rows.filter(r => r.status === 'Cerrado').length;
    const incidentsByPriority = rows.reduce((acc, curr) => {
      acc[curr.priority] = (acc[curr.priority] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalIncidents,
        openIncidents,
        closedIncidents,
        incidentsByPriority
      },
      details: rows
    };
  }

  static async getAssetsReport(startDate, endDate) {
    const query = `
      SELECT
        id_asset,
        name,
        type,
        category,
        criticality,
        upload_date,
        description
      FROM assets
      WHERE upload_date BETWEEN $1 AND $2
      ORDER BY upload_date DESC;
    `;
    const { rows } = await pool.query(query, [startDate, endDate]);
    return rows;
  }

  static async getAuditsReport(startDate, endDate) {
    const query = `
      SELECT
        a.id_audit,
        a.title,
        a.scheduled_date,
        a.assigned_auditor,
        a.status,
        COUNT(ape.id_evaluation) FILTER (WHERE ape.is_compliant = TRUE) AS compliant_policies,
        COUNT(ape.id_evaluation) FILTER (WHERE ape.is_compliant = FALSE) AS non_compliant_policies,
        a.final_report_path
      FROM audits a
      LEFT JOIN audit_policy_evaluations ape ON a.id_audit = ape.audit_id
      WHERE a.created_at BETWEEN $1 AND $2 -- O a.scheduled_date
      GROUP BY a.id_audit
      ORDER BY a.scheduled_date DESC;
    `;
    const { rows } = await pool.query(query, [startDate, endDate]);
    return rows;
  } 
}

module.exports = Report;