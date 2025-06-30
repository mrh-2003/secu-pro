const Dashboard = require('../models/dashboard.model');

exports.getDashboardSummary = async (req, res) => {
  try {
    const reportedIncidents = await Dashboard.getReportedIncidentsCount();
    const complianceStatus = await Dashboard.getComplianceStatus();
    const resolvedIncidentsRatio = await Dashboard.getResolvedIncidentsRatio();

    res.json({
      reportedIncidents,
      complianceStatus,
      resolvedIncidentsRatio
    });
  } catch (error) {
    console.error('Error al obtener el resumen del dashboard:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el resumen del dashboard.' });
  }
};