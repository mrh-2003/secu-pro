const express = require('express');
const router = express.Router();
const accessController = require('../controllers/access.controller');

router.get('/', accessController.getUsersWithAccesses);
router.get('/:userId', accessController.getUserAccessDetails);
router.post('/:userId/assign', accessController.assignRemoveAccess); 

module.exports = router;