const express = require('express');
const cors = require('cors');
const path = require('path');
const assetRoutes = require('./routes/asset.routes'); 
const authRoutes = require('./routes/auth.routes');
const accessRoutes = require('./routes/access.routes');
const policyRoutes = require('./routes/policy.routes'); 
const incidentRoutes = require('./routes/incident.routes');
const auditRoutes = require('./routes/audit.routes');
const trainingRoutes = require('./routes/training.routes');
const reportRoutes = require('./routes/report.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const app = express();

app.use(cors({
  origin: '*',
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join('uploads')));
 
app.use('/auth', authRoutes);
app.use('/assets', assetRoutes);
app.use('/access', accessRoutes); 
app.use('/policies', policyRoutes);
app.use('/incidents', incidentRoutes);
app.use('/audits', auditRoutes);
app.use('/training', trainingRoutes);
app.use('/reports', reportRoutes); 
app.use('/dashboard', dashboardRoutes); 
app.use('/notifications', notificationRoutes);
app.get('/run', (req, res) => {
  res.status(200).json({ message: "Run" });
});
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo salió mal en el servidor!', error: err.message });
});

module.exports = app;
