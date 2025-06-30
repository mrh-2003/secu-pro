const Notification = require('../models/notification.model');
const Incident = require('../models/incident.model'); 

exports.getNotificationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: 'ID de usuario es requerido.' });
    }
    const notifications = await Notification.getAssignedIncidentsForUser(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones por usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener notificaciones.' });
  }
};

exports.markNotificationStatus = async (req, res) => {
  try {
    const { userId, incidentId, newStatus } = req.body;

    if (!userId || !incidentId || !newStatus) {
      return res.status(400).json({ message: 'ID de usuario, ID de incidente y nuevo estado son requeridos.' });
    }

    const validStatuses = ['Nuevo', 'Leído', 'Atendido'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: 'Estado inválido. Debe ser "Nuevo", "Leído" o "Atendido".' });
    }

    const updatedStatus = await Notification.updateNotificationStatus(userId, incidentId, newStatus);
    res.json(updatedStatus);
  } catch (error) {
    console.error('Error al actualizar estado de notificación:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar el estado de la notificación.' });
  }
};
 
exports.getIncidentDetailsForNotification = async (req, res) => {
  try {
    const { incidentId } = req.params;
    const incident = await Incident.findById(incidentId);  
    if (!incident) {
      return res.status(404).json({ message: 'Incidente no encontrado.' });
    } 
    if (incident.help_links) {
        try {
            incident.help_links = JSON.parse(incident.help_links);
        } catch (e) {
            console.warn('Could not parse help_links:', e);
            incident.help_links = [];
        }
    } else {
        incident.help_links = [];
    }
    res.json(incident);
  } catch (error) {
    console.error('Error al obtener detalles de incidente para notificación:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el incidente.' });
  }
};