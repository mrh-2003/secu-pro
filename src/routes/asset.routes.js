const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
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
 
router.post('/', upload.single('document'), assetController.createAsset);
router.get('/', assetController.getAllAssets);
router.get('/:id', assetController.getAssetById);
router.put('/:id', upload.single('document'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);
router.get('/documents/:userId', assetController.getAssignedDocuments);
router.get('/download/:filename', assetController.downloadDocument);

module.exports = router;