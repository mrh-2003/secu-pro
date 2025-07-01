const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/training.controller');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('material_file'), trainingController.createCourse);
router.get('/', trainingController.getAllCourses);
router.get('/:id', trainingController.getCourseDetails);

router.get('/monitor/summary', trainingController.getPolicyProgressSummary);
router.get('/monitor/course/:courseId/detail', trainingController.getCourseProgressDetail);

router.get('/employee/:userId/policies', trainingController.getPoliciesWithCourseStatus);
router.get('/employee/:userId/policy/:policyId/courses', trainingController.getCoursesByPolicyForUser);
router.get('/employee/:userId/course/:courseId', trainingController.getCourseDetailsForUser);
router.post('/employee/:userId/course/:courseId/submit-answers', trainingController.submitCourseAnswers);

module.exports = router;