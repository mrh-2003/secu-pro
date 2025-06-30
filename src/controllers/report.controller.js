const Report = require('../models/report.model');

exports.generateReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({ message: 'Tipo de reporte y rango de fechas son obligatorios.' });
    }

    let reportData;
    switch (reportType) {
      case 'access':
        reportData = await Report.getAccessReport(startDate, endDate);
        break;
      case 'incidents':
        reportData = await Report.getIncidentsReport(startDate, endDate);
        break;
      case 'assets':
        reportData = await Report.getAssetsReport(startDate, endDate);
        break;
      case 'audits':
        reportData = await Report.getAuditsReport(startDate, endDate);
        break;
      default:
        return res.status(400).json({ message: 'Tipo de reporte inválido.' });
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error al generar reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor al generar el reporte.' });
  }
};