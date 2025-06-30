const pool = require('../config/db.config');

class Training {
  static async createCourse({ policy_id, title, description, material_type, material_link, order_in_policy }) {
    const query = `
      INSERT INTO training_courses (policy_id, title, description, material_type, material_link, order_in_policy)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_course, policy_id, title, description, material_type, material_link, order_in_policy, created_at;
    `;
    const values = [policy_id, title, description, material_type, material_link, order_in_policy];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findAllCourses() {
    const query = `
      SELECT tc.id_course, tc.policy_id, p.title AS policy_title, tc.title, tc.description, tc.material_type, tc.material_link, tc.order_in_policy, tc.created_at
      FROM training_courses tc
      LEFT JOIN policies p ON tc.policy_id = p.id_policy
      ORDER BY tc.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findCourseById(id) {
    const query = `
      SELECT tc.id_course, tc.policy_id, p.title AS policy_title, tc.title, tc.description, tc.material_type, tc.material_link, tc.order_in_policy, tc.created_at
      FROM training_courses tc
      LEFT JOIN policies p ON tc.policy_id = p.id_policy
      WHERE tc.id_course = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async updateCourse(id, { policy_id, title, description, material_type, material_link, order_in_policy }) {
    const query = `
      UPDATE training_courses
      SET
        policy_id = $1, title = $2, description = $3, material_type = $4, material_link = $5, order_in_policy = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id_course = $7
      RETURNING *;
    `;
    const values = [policy_id, title, description, material_type, material_link, order_in_policy, id];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async deleteCourse(id) {
    const query = `DELETE FROM training_courses WHERE id_course = $1 RETURNING material_link;`;
    const { rows } = await pool.query(query, [id]);
    return rows[0] ? rows[0].material_link : null;
  }

  static async addQuestion({ course_id, question_text, options }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const questionQuery = `INSERT INTO questions (course_id, question_text) VALUES ($1, $2) RETURNING id_question;`;
      const { rows: qRows } = await client.query(questionQuery, [course_id, question_text]);
      const questionId = qRows[0].id_question;

      for (const opt of options) {
        const optionQuery = `INSERT INTO options (question_id, option_text, is_correct) VALUES ($1, $2, $3);`;
        await client.query(optionQuery, [questionId, opt.option_text, opt.is_correct]);
      }
      await client.query('COMMIT');
      return { id_question: questionId };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getQuestionsByCourse(courseId) {
    const query = `
      SELECT q.id_question, q.question_text, o.id_option, o.option_text, o.is_correct
      FROM questions q
      JOIN options o ON q.id_question = o.question_id
      WHERE q.course_id = $1
      ORDER BY q.created_at, o.id_option;
    `;
    const { rows } = await pool.query(query, [courseId]);

    const questionsMap = new Map();
    rows.forEach(row => {
      if (!questionsMap.has(row.id_question)) {
        questionsMap.set(row.id_question, {
          id_question: row.id_question,
          question_text: row.question_text,
          options: []
        });
      }
      questionsMap.get(row.id_question).options.push({
        id_option: row.id_option,
        option_text: row.option_text,
        is_correct: row.is_correct
      });
    });
    return Array.from(questionsMap.values());
  }

  static async getPolicyProgressSummary() {
    const query = `
      SELECT
          p.id_policy,
          p.title AS policy_title,
          tc.id_course,
          tc.title AS course_title,
          COUNT(DISTINCT q.id_question) AS total_questions_course,
          COUNT(DISTINCT CASE WHEN ucp.status = 'Completado' THEN ucp.user_id END) AS completed_users,
          COUNT(DISTINCT CASE WHEN ucp.status = 'En curso' THEN ucp.user_id END) AS in_progress_users,
          (SELECT COUNT(id_user) FROM users WHERE role = 'Empleado') - COUNT(DISTINCT ucp.user_id) AS not_started_users
      FROM policies p
      JOIN training_courses tc ON p.id_policy = tc.policy_id
      LEFT JOIN questions q ON tc.id_course = q.course_id
      LEFT JOIN user_course_progress ucp ON tc.id_course = ucp.course_id
      GROUP BY p.id_policy, p.title, tc.id_course, tc.title
      ORDER BY p.title, tc.order_in_policy;
    `;
    const { rows } = await pool.query(query);

    const policyMap = new Map();
    rows.forEach(row => {
      if (!policyMap.has(row.id_policy)) {
        policyMap.set(row.id_policy, {
          id_policy: row.id_policy,
          policy_title: row.policy_title,
          total_micro_courses: 0,
          total_questions_policy: 0,
          total_completed_users: 0,
          total_in_progress_users: 0,
          total_not_started_users: 0,
          micro_courses: []
        });
      }
      const policySummary = policyMap.get(row.id_policy);
      policySummary.total_micro_courses++;
      policySummary.total_questions_policy += parseInt(row.total_questions_course || 0);
      policySummary.micro_courses.push({
        id_course: row.id_course,
        course_title: row.course_title,
        total_questions: parseInt(row.total_questions_course || 0),
        completed_users: parseInt(row.completed_users || 0),
        in_progress_users: parseInt(row.in_progress_users || 0),
        not_started_users: parseInt(row.not_started_users || 0)
      });
    });
    return Array.from(policyMap.values());
  }


  static async getCourseProgressDetail(courseId) {
    const query = `
      SELECT
        u.id_user,
        u.name AS user_name,
        ucp.status AS progress_status,
        ucp.completed_date
      FROM users u
      LEFT JOIN user_course_progress ucp ON u.id_user = ucp.user_id AND ucp.course_id = $1
      WHERE u.role = 'Empleado'
      ORDER BY u.name;
    `;
    const { rows } = await pool.query(query, [courseId]);
    return rows;
  }

  static async getPoliciesWithCourseStatus(userId) {
    const query = `
      SELECT
          p.id_policy,
          p.title AS policy_title,
          COUNT(tc.id_course) AS total_courses_in_policy,
          COUNT(ucp.id_progress) FILTER (WHERE ucp.user_id = $1 AND ucp.status = 'Completado') AS user_completed_courses_in_policy,
          bool_or(ucp.status = 'En curso' AND ucp.user_id = $1) AS is_in_progress
      FROM policies p
      JOIN training_courses tc ON p.id_policy = tc.policy_id
      LEFT JOIN user_course_progress ucp ON tc.id_course = ucp.course_id AND ucp.user_id = $1
      GROUP BY p.id_policy, p.title
      ORDER BY p.title;
    `;
    const { rows } = await pool.query(query, [userId]);

    return rows.map(row => {
      let status = 'No iniciado';
      if (parseInt(row.user_completed_courses_in_policy) === parseInt(row.total_courses_in_policy) && parseInt(row.total_courses_in_policy) > 0) {
        status = 'Finalizado';
      } else if (row.is_in_progress || parseInt(row.user_completed_courses_in_policy) > 0) {
        status = 'En curso';
      }
      return {
        id_policy: row.id_policy,
        policy_title: row.policy_title,
        total_courses: parseInt(row.total_courses_in_policy),
        user_completed_courses: parseInt(row.user_completed_courses_in_policy),
        status: status
      };
    });
  }

  static async getCoursesByPolicyForUser(policyId, userId) {
    const query = `
      SELECT
          tc.id_course,
          tc.title AS course_title,
          tc.order_in_policy,
          ucp.status AS user_progress_status
      FROM training_courses tc
      LEFT JOIN user_course_progress ucp ON tc.id_course = ucp.course_id AND ucp.user_id = $2
      WHERE tc.policy_id = $1
      ORDER BY tc.order_in_policy;
    `;
    const { rows } = await pool.query(query, [policyId, userId]);

    let previousCourseCompleted = true;
    return rows.map(row => {
      const isLocked = !previousCourseCompleted;
      previousCourseCompleted = (row.user_progress_status === 'Completado');

      let actionStatus = 'Bloqueado';
      if (!isLocked) {
        if (row.user_progress_status === 'Completado') {
          actionStatus = 'Hecho';
        } else if (row.user_progress_status === 'En curso') {
          actionStatus = 'En curso';
        } else {
          actionStatus = 'No iniciado';
        }
      }

      return {
        id_course: row.id_course,
        course_title: row.course_title,
        order_in_policy: row.order_in_policy,
        user_progress_status: row.user_progress_status,
        action_status: actionStatus,
        is_locked: isLocked
      };
    });
  }


  static async getCourseDetailsForUser(courseId, userId) {
    const courseQuery = `
      SELECT tc.id_course, tc.policy_id, p.title AS policy_title, tc.title, tc.description, tc.material_type, tc.material_link, tc.order_in_policy
      FROM training_courses tc
      LEFT JOIN policies p ON tc.policy_id = p.id_policy
      WHERE tc.id_course = $1;
    `;
    const { rows: courseRows } = await pool.query(courseQuery, [courseId]);
    if (courseRows.length === 0) return null;
    const course = courseRows[0];

    const questions = await Training.getQuestionsByCourse(courseId);

    const userProgressQuery = `
      SELECT status, total_questions, correct_answers, attempts
      FROM user_course_progress
      WHERE user_id = $1 AND course_id = $2;
    `;
    const { rows: progressRows } = await pool.query(userProgressQuery, [userId, courseId]);
    const userProgress = progressRows[0];

    return { course, questions, user_progress: userProgress };
  }

  static async submitCourseAnswers(userId, courseId, answers) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const ans of answers) {
        const insertAnswerQuery = `
          INSERT INTO user_Youtubes (user_id, course_id, question_id, selected_option_id, is_correct_answer)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, course_id, question_id) DO UPDATE SET selected_option_id = $4, is_correct_answer = $5, answered_at = CURRENT_TIMESTAMP;
        `;
        await client.query(insertAnswerQuery, [userId, courseId, ans.question_id, ans.selected_option_id, ans.is_correct_answer]);
      }

      const totalQuestionsQuery = `SELECT COUNT(*) FROM questions WHERE course_id = $1;`;
      const { rows: totalQRows } = await client.query(totalQuestionsQuery, [courseId]);
      const totalQuestions = parseInt(totalQRows[0].count);

      const correctAnswersQuery = `
        SELECT COUNT(*)
        FROM user_Youtubes uqa
        JOIN options o ON uqa.selected_option_id = o.id_option
        WHERE uqa.user_id = $1 AND uqa.course_id = $2 AND o.is_correct = TRUE AND uqa.is_correct_answer = TRUE;
      `;
      const { rows: correctQRows } = await client.query(correctAnswersQuery, [userId, courseId]);
      const correctAnswers = parseInt(correctQRows[0].count);

      let status = 'En curso';
      let completedDate = null;
      if (correctAnswers === totalQuestions && totalQuestions > 0) {
        status = 'Completado';
        completedDate = 'CURRENT_TIMESTAMP';
      }

      const updateProgressQuery = `
        INSERT INTO user_course_progress (user_id, course_id, status, total_questions, correct_answers, attempts, last_attempt_date, completed_date)
        VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, ${completedDate || 'NULL'})
        ON CONFLICT (user_id, course_id) DO UPDATE SET
          status = $3,
          total_questions = $4,
          correct_answers = $5,
          attempts = user_course_progress.attempts + 1,
          last_attempt_date = CURRENT_TIMESTAMP,
          completed_date = ${completedDate || 'NULL'};
      `;
      await client.query(updateProgressQuery, [userId, courseId, status, totalQuestions, correctAnswers]);

      await client.query('COMMIT');
      return { totalQuestions, correctAnswers, status };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async enableNextCourse(userId, policyId, currentCourseOrder) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const nextCourseQuery = `
        SELECT id_course
        FROM training_courses
        WHERE policy_id = $1 AND order_in_policy = $2 + 1;
      `;
      const { rows: nextCourseRows } = await client.query(nextCourseQuery, [policyId, currentCourseOrder]);

      if (nextCourseRows.length > 0) {
        const nextCourseId = nextCourseRows[0].id_course;
        const checkProgressQuery = `SELECT status FROM user_course_progress WHERE user_id = $1 AND course_id = $2;`;
        const { rows: checkProgressRows } = await client.query(checkProgressQuery, [userId, nextCourseId]);

        if (checkProgressRows.length === 0) {
          const insertProgressQuery = `
            INSERT INTO user_course_progress (user_id, course_id, status, total_questions, correct_answers, attempts)
            VALUES ($1, $2, 'No iniciado', 0, 0, 0);
          `;
          await client.query(insertProgressQuery, [userId, nextCourseId]);
        }
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

}

module.exports = Training;