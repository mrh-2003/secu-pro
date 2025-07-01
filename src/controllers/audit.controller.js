const Audit = require('../models/audit.model');
const Policy = require('../models/policy.model');
const bucket = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

exports.createAudit = async (req, res) => {
  try {
    const { title, description, scheduled_date, assigned_auditor } = req.body;

    if (!title || !scheduled_date || !assigned_auditor) {
      return res.status(400).json({ message: 'Título, fecha programada y auditor asignado son obligatorios.' });
    }

    const newAudit = await Audit.create({ title, description, scheduled_date, assigned_auditor });
    res.status(201).json(newAudit);
  } catch (error) {
    console.error('Error al crear auditoría:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear la auditoría.' });
  }
};

exports.getAllAudits = async (req, res) => {
  try {
    const { statusFilter } = req.query;
    const audits = await Audit.findAll(statusFilter);
    res.json(audits);
  } catch (error) {
    console.error('Error al obtener auditorías:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener auditorías.' });
  }
};

exports.getAuditById = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await Audit.findById(id);
    if (!audit) {
      return res.status(404).json({ message: 'Auditoría no encontrada.' });
    }
    res.json(audit);
  } catch (error) {
    console.error('Error al obtener auditoría por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener la auditoría.' });
  }
};

exports.updateAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_date, assigned_auditor, status } = req.body;

    let finalReportPath = req.body.final_report_path_to_keep;

    const oldAudit = await Audit.findById(id);

    if (!title || !scheduled_date || !assigned_auditor || !status) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    if (req.file) {
      if (oldAudit && oldAudit.final_report_path) {
        try {
          const fileNameWithEncoding = oldAudit.final_report_path.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Informe antiguo ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el informe antiguo de Firebase Storage: ${deleteError.message}`);
        }
      }

      const fileName = `${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
        public: true,
        resumable: false
      });
      finalReportPath = file.publicUrl();
    } else if (req.body.clearFinalReport === 'true') {
      if (oldAudit && oldAudit.final_report_path) {
        try {
          const fileNameWithEncoding = oldAudit.final_report_path.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Informe ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el informe de Firebase Storage: ${deleteError.message}`);
        }
      }
      finalReportPath = null;
    } else if (oldAudit) {
      finalReportPath = oldAudit.final_report_path;
    }

    const validStatuses = ['Pendiente', 'En proceso', 'Finalizado'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado de auditoría inválido.' });
    }

    if (status === 'Finalizado' && !finalReportPath) {
      return res.status(400).json({ message: 'Debe adjuntar el informe final para cambiar el estado a "Finalizado".' });
    }

    const updatedAudit = await Audit.update(id, {
      title, description, scheduled_date, assigned_auditor, status,
      final_report_path: finalReportPath
    });

    if (!updatedAudit) {
      return res.status(404).json({ message: 'Auditoría no encontrada para actualizar.' });
    }
    res.json(updatedAudit);
  } catch (error) {
    console.error('Error al actualizar auditoría:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar la auditoría.' });
  }
};

exports.deleteAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const finalReportPath = await Audit.delete(id);

    if (finalReportPath) {
      try {
        const fileNameWithEncoding = finalReportPath.split('/').pop().split('?')[0];
        const fileName = decodeURIComponent(fileNameWithEncoding);
        await bucket.file(fileName).delete();
        console.log(`Informe ${fileName} eliminado de Firebase Storage.`);
      } catch (deleteError) {
        console.warn(`No se pudo eliminar el informe de Firebase Storage: ${deleteError.message}`);
      }
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar auditoría:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar la auditoría.' });
  }
};

exports.getPoliciesForEvaluation = async (req, res) => {
  try {
    const { auditId } = req.params;
    const allPolicies = await Policy.findAll();
    const existingEvaluations = await Audit.getEvaluatedPolicies(auditId);

    const policiesForFrontend = allPolicies.map(policy => {
      const evaluation = existingEvaluations.find(eval => eval.id_policy === policy.id_policy);
      return {
        id: policy.id_policy,
        title: policy.title,
        category: policy.category,
        iso_clause: policy.iso_clause,
        status: policy.status,
        is_compliant: evaluation ? evaluation.is_compliant : true,
        observations: evaluation ? evaluation.observations : ''
      };
    });
    res.json(policiesForFrontend);
  } catch (error) {
    console.error('Error al obtener políticas para evaluación:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

exports.savePolicyEvaluations = async (req, res) => {
  try {
    const { auditId } = req.params;
    const { evaluations } = req.body;
    if (!Array.isArray(evaluations)) {
      return res.status(400).json({ message: 'Formato de evaluaciones inválido.' });
    }

    await Audit.saveEvaluations(auditId, evaluations);

    const audit = await Audit.findById(auditId);
    if (audit && audit.status === 'Pendiente') {
      await Audit.update(auditId, { ...audit, status: 'En proceso' });
    }

    res.status(200).json({ message: 'Evaluaciones guardadas con éxito.' });
  } catch (error) {
    console.error('Error al guardar evaluaciones de políticas:', error);
    res.status(500).json({ message: 'Error interno del servidor al guardar evaluaciones.' });
  }
};