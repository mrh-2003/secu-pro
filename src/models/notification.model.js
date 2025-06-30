const pool = require('../config/db.config');

class Notification {
  static async getAssignedIncidentsForUser(userId) {
    const query = `
      SELECT
        i.id_incident,
        i.incident_type,
        i.description,
        i.priority,
        i.status AS incident_status,
        i.created_at,
        i.evidence,
        COALESCE(ns.status, 'Nuevo') AS notification_status,
        ns.status_updated_at
      FROM incidents i
      LEFT JOIN notification_status ns ON i.id_incident = ns.incident_id AND ns.user_id = $1
      WHERE i.assigned_to = $1
      ORDER BY i.created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  static async updateNotificationStatus(userId, incidentId, newStatus) {
    const query = `
      INSERT INTO notification_status (user_id, incident_id, status, status_updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, incident_id) DO UPDATE SET status = $3, status_updated_at = CURRENT_TIMESTAMP
      RETURNING id_notification_status, user_id, incident_id, status, status_updated_at;
    `;
    const { rows } = await pool.query(query, [userId, incidentId, newStatus]);
    return rows[0];
  }
}

module.exports = Notification;