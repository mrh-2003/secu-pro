const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
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
 
router.post('/', auditController.createAudit); 
router.get('/', auditController.getAllAudits);
router.get('/:id', auditController.getAuditById); 
router.put('/:id', upload.single('final_report'), auditController.updateAudit);
router.delete('/:id', auditController.deleteAudit);  
 
router.get('/:auditId/evaluations/policies', auditController.getPoliciesForEvaluation);  
router.post('/:auditId/evaluations', auditController.savePolicyEvaluations);  

module.exports = router;