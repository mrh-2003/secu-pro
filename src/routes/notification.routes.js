const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

router.get('/:userId', notificationController.getNotificationsByUserId);
router.get('/incident-details/:incidentId', notificationController.getIncidentDetailsForNotification); // Para el detalle
router.post('/update-status', notificationController.markNotificationStatus);

module.exports = router;