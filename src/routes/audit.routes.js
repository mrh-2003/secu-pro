const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auditController.createAudit);
router.get('/', auditController.getAllAudits);
router.get('/:id', auditController.getAuditById);
router.put('/:id', upload.single('final_report'), auditController.updateAudit);
router.delete('/:id', auditController.deleteAudit);

router.get('/:auditId/evaluations/policies', auditController.getPoliciesForEvaluation);
router.post('/:auditId/evaluations', auditController.savePolicyEvaluations);

module.exports = router;