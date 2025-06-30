const pool = require('../config/db.config');

class Access {
  static async findUserAccesses() {
    const query = `
      SELECT
        u.id_user,
        u.name AS user_name,
        u.position,
        ARRAY_AGG(
          json_build_object(
            'asset_id', a.id_asset,
            'asset_name', a.name,
            'permission_id', ap.id_permission,
            'assigned_date', ap.assigned_date
          )
        ) FILTER (WHERE a.id_asset IS NOT NULL) AS assigned_assets
      FROM users u
      LEFT JOIN access_permissions ap ON u.id_user = ap.user_id
      LEFT JOIN assets a ON ap.asset_id = a.id_asset
      GROUP BY u.id_user, u.name, u.position
      ORDER BY u.name;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findAccessesByUserId(userId) {
    const query = `
      SELECT
        ap.id_permission,
        ap.user_id,
        ap.asset_id,
        a.name AS asset_name,
        ap.assigned_date
      FROM access_permissions ap
      JOIN assets a ON ap.asset_id = a.id_asset
      WHERE ap.user_id = $1;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  static async assignAccess(userId, assetId) {
    const query = `
      INSERT INTO access_permissions (user_id, asset_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, asset_id) DO NOTHING
      RETURNING id_permission, user_id, asset_id, assigned_date;
    `;
    const { rows } = await pool.query(query, [userId, assetId]);
    return rows[0];
  }

  static async removeAccess(userId, assetId) {
    const query = `
      DELETE FROM access_permissions
      WHERE user_id = $1 AND asset_id = $2
      RETURNING id_permission;
    `;
    const { rows } = await pool.query(query, [userId, assetId]);
    return rows[0];
  }
}

module.exports = Access;