const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
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

router.post('/', upload.single('document'), policyController.createPolicy);
router.get('/', policyController.getAllPolicies);
router.get('/:id', policyController.getPolicyById);
router.put('/:id', upload.single('document'), policyController.updatePolicy);
router.delete('/:id', policyController.deletePolicy);
router.post('/mark-as-read', policyController.markPolicyAsRead); 

module.exports = router;