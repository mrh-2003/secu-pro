const Audit = require('../models/audit.model');
const Policy = require('../models/policy.model');  
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join('uploads');

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

    if (req.file) {
      const oldAudit = await Audit.findById(id);
      if (oldAudit && oldAudit.final_report_path) {
        const oldFilePath = path.join(uploadsDir, oldAudit.final_report_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      finalReportPath = req.file.filename;
    } else if (req.body.clearFinalReport === 'true') {  
      const oldAudit = await Audit.findById(id);
      if (oldAudit && oldAudit.final_report_path) {
        const oldFilePath = path.join(uploadsDir, oldAudit.final_report_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      finalReportPath = null;
    } else { 
      const currentAudit = await Audit.findById(id);
      finalReportPath = currentAudit ? currentAudit.final_report_path : null;
    }
 
    if (status === 'Finalizado' && !finalReportPath) {
      return res.status(400).json({ message: 'Debe adjuntar el informe final para cambiar el estado a "Finalizado".' });
    }
    const validStatuses = ['Pendiente', 'En proceso', 'Finalizado'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Estado de auditoría inválido.' });
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
      const filePath = path.join(uploadsDir, finalReportPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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