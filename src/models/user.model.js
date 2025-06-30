const pool = require('../config/db.config');

class User {
  static async insertUser(name, email, role, position) {
    const result = await pool.query(
      `INSERT INTO users (name, email, role, position)
       VALUES ($1, $2, $3, $4)
       RETURNING id_user, name, email, role, position;`,
      [name, email, role, position]
    );
    return result.rows[0];
  }

  static async loginUser(email) {
    const result = await pool.query(
      `SELECT id_user, name, position, email, role
       FROM users
       WHERE email = $1;`,
      [email]
    );
    return result.rows;
  }

  static async findAll() {
    const query = `
      SELECT id_user, name, position, email, role, created_at
      FROM users;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT id_user, name, position, email, role, created_at
      FROM users
      WHERE id_user = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = User;
