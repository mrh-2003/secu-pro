const pool = require('../config/db.config');

class Dashboard {
  static async getReportedIncidentsCount() {
    const query = `
      SELECT COUNT(id_incident) AS total_incidents
      FROM incidents;
    `;
    const { rows } = await pool.query(query);
    return parseInt(rows[0].total_incidents || 0);
  }

  static async getComplianceStatus() {
    const policiesQuery = `
      SELECT COUNT(p.id_policy) AS total_policies,
             COUNT(prs.policy_id) AS read_policies
      FROM policies p
      LEFT JOIN policy_read_status prs ON p.id_policy = prs.policy_id;
    `;
    const auditsQuery = `
      SELECT COUNT(id_audit) AS total_audits,
             COUNT(CASE WHEN status = 'Finalizado' THEN 1 END) AS completed_audits
      FROM audits;
    `;

    const [policiesRes, auditsRes] = await Promise.all([
      pool.query(policiesQuery),
      pool.query(auditsQuery)
    ]);

    const totalPolicies = parseInt(policiesRes.rows[0].total_policies || 0);
    const readPolicies = parseInt(policiesRes.rows[0].read_policies || 0);
    const totalAudits = parseInt(auditsRes.rows[0].total_audits || 0);
    const completedAudits = parseInt(auditsRes.rows[0].completed_audits || 0);
 
    if (totalPolicies === 0 && totalAudits === 0) {
        return 'Sin datos';
    }
    if (readPolicies / totalPolicies > 0.8 && completedAudits / totalAudits > 0.8) {
        return 'Adecuado';
    } else if (readPolicies / totalPolicies > 0.5 || completedAudits / totalAudits > 0.5) {
        return 'Parcial';
    } else {
        return 'Requiere Atención';
    }
  }

  static async getResolvedIncidentsRatio() {
    const query = `
      SELECT
        COUNT(id_incident) AS total_incidents,
        COUNT(CASE WHEN status = 'Cerrado' THEN 1 END) AS resolved_incidents
      FROM incidents;
    `;
    const { rows } = await pool.query(query);
    const total = parseInt(rows[0].total_incidents || 0);
    const resolved = parseInt(rows[0].resolved_incidents || 0);

    if (total === 0) {
      return '0%';
    }
    const ratio = (resolved / total) * 100;
    return `${ratio.toFixed(0)}%`;
  }
}

module.exports = Dashboard;