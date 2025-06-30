const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incident.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
 
router.post('/', upload.single('evidence'), incidentController.createIncident);
 
router.get('/', incidentController.getAllIncidents);
router.get('/:id', incidentController.getIncidentById);
 
router.put('/:id/solution', upload.single('help_documents'), incidentController.updateIncidentSolution);
 
router.delete('/:id', incidentController.deleteIncident);
 
router.get('/employees/assignable', incidentController.getEmployeesForAssignment);


module.exports = router;