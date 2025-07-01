const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('evidence'), incidentController.createIncident);

router.get('/', incidentController.getAllIncidents);
router.get('/:id', incidentController.getIncidentById);

router.put('/:id/solution', upload.single('help_documents'), incidentController.updateIncidentSolution);

router.delete('/:id', incidentController.deleteIncident);

router.get('/employees/assignable', incidentController.getEmployeesForAssignment);

module.exports = router;