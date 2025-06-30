const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('document'), assetController.createAsset);
router.get('/', assetController.getAllAssets);
router.get('/:id', assetController.getAssetById);
router.put('/:id', upload.single('document'), assetController.updateAsset);
router.delete('/:id', assetController.deleteAsset);
router.get('/documents/:userId', assetController.getAssignedDocuments);

module.exports = router;