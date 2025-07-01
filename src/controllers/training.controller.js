const Training = require('../models/training.model');
const bucket = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

exports.createCourse = async (req, res) => {
  try {
    const { policy_id, title, description, material_type, order_in_policy, questions_data } = req.body;

    let materialLink = null;

    if (material_type === 'video') {
      materialLink = req.body.material_link;
    } else if (req.file) {
      const fileName = `${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
        public: true,
        resumable: false
      });
      materialLink = file.publicUrl();
    }

    if (!title || !description || !material_type || !order_in_policy) {
      return res.status(400).json({ message: 'Campos obligatorios del curso faltantes.' });
    }
    
    const finalPolicyId = policy_id ? parseInt(policy_id) : null;
    const finalOrderInPolicy = parseInt(order_in_policy);

    const newCourse = await Training.createCourse({
      policy_id: finalPolicyId,
      title,
      description,
      material_type,
      material_link: materialLink,
      order_in_policy: finalOrderInPolicy
    });

    if (questions_data) {
      const parsedQuestions = JSON.parse(questions_data);
      for (const qData of parsedQuestions) {
        await Training.addQuestion({
          course_id: newCourse.id_course,
          question_text: qData.question_text,
          options: qData.options
        });
      }
    }
    res.status(201).json(newCourse);
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear el curso.' });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Training.findAllCourses();
    res.json(courses);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener cursos.' });
  }
};

exports.getCourseDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Training.findCourseById(id);
    if (!course) {
      return res.status(404).json({ message: 'Curso no encontrado.' });
    }
    const questions = await Training.getQuestionsByCourse(id);
    res.json({ ...course, questions });
  } catch (error) {
    console.error('Error al obtener detalles del curso:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener detalles del curso.' });
  }
};

exports.getPolicyProgressSummary = async (req, res) => {
  try {
    const summary = await Training.getPolicyProgressSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error al obtener resumen de progreso de políticas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.getCourseProgressDetail = async (req, res) => {
  try {
    const { courseId } = req.params;
    const details = await Training.getCourseProgressDetail(courseId);
    res.json(details);
  } catch (error) {
    console.error('Error al obtener detalle de progreso del curso:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.getPoliciesWithCourseStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const policies = await Training.getPoliciesWithCourseStatus(userId);
    res.json(policies);
  } catch (error) {
    console.error('Error al obtener políticas con estado de curso para usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.getCoursesByPolicyForUser = async (req, res) => {
  try {
    const { policyId, userId } = req.params;
    const courses = await Training.getCoursesByPolicyForUser(policyId, userId);
    res.json(courses);
  } catch (error) {
    console.error('Error al obtener cursos por política para usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.getCourseDetailsForUser = async (req, res) => {
  try {
    const { courseId, userId } = req.params;
    const details = await Training.getCourseDetailsForUser(courseId, userId);
    if (!details) {
      return res.status(404).json({ message: 'Curso no encontrado.' });
    }
    res.json(details);
  } catch (error) {
    console.error('Error al obtener detalles de curso para usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.submitCourseAnswers = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'Respuestas no proporcionadas.' });
    }

    const result = await Training.submitCourseAnswers(parseInt(userId), parseInt(courseId), answers);

    if (result.status === 'Completado' && result.totalQuestions > 0) {
      const course = await Training.findCourseById(courseId);
      if (course && course.policy_id) {
        await Training.enableNextCourse(parseInt(userId), course.policy_id, course.order_in_policy);
      }
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al enviar respuestas del curso:', error);
    res.status(500).json({ message: 'Error interno del servidor al enviar respuestas.' });
  }
};