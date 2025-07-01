const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('document'), policyController.createPolicy);
router.get('/', policyController.getAllPolicies);
router.get('/:id', policyController.getPolicyById);
router.put('/:id', upload.single('document'), policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.post('/mark-as-read', policyController.markPolicyAsRead); 

module.exports = router;