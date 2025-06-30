const Policy = require('../models/policy.model');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join('uploads');

exports.createPolicy = async (req, res) => {
  try {
    const { title, description, category, iso_clause, classification, status } = req.body;
    const documentPath = req.file ? req.file.filename : null;

    if (!title || !description || !category || !classification || !status) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    const newPolicy = await Policy.create({ title, description, category, iso_clause, classification, status, documentPath });
    res.status(201).json(newPolicy);
  } catch (error) {
    console.error('Error al crear política:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear la política.' });
  }
};

exports.getAllPolicies = async (req, res) => {
  try {
    const { searchTerm, categoryFilter, statusFilter, userId } = req.query;  
    let policies;

    if (userId) {  
      policies = await Policy.findPoliciesWithReadStatus(userId, searchTerm, categoryFilter, statusFilter);
    } else {  
      policies = await Policy.findAll(searchTerm, categoryFilter, statusFilter);
    }
    
    res.json(policies);
  } catch (error) {
    console.error('Error al obtener políticas:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener políticas.' });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ message: 'Política no encontrada.' });
    }
    res.json(policy);
  } catch (error) {
    console.error('Error al obtener política por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener la política.' });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, iso_clause, classification, status } = req.body;
    let documentPath = req.body.documentPath;  
    if (req.file) {
      const oldPolicy = await Policy.findById(id);
      if (oldPolicy && oldPolicy.document_path) {
        const oldFilePath = path.join(uploadsDir, oldPolicy.document_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      documentPath = req.file.filename;
    } else if (req.body.clearDocument === 'true') {
      const oldPolicy = await Policy.findById(id);
      if (oldPolicy && oldPolicy.document_path) {
        const oldFilePath = path.join(uploadsDir, oldPolicy.document_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      documentPath = null;
    }

    if (!title || !description || !category || !classification || !status) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    const updatedPolicy = await Policy.update(id, { title, description, category, iso_clause, classification, status, documentPath });
    if (!updatedPolicy) {
      return res.status(404).json({ message: 'Política no encontrada para actualizar.' });
    }
    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error al actualizar política:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar la política.' });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const documentPath = await Policy.delete(id);

    if (documentPath) {
      const filePath = path.join(uploadsDir, documentPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar política:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar la política.' });
  }
};

exports.markPolicyAsRead = async (req, res) => {
  try {
    const { userId, policyId } = req.body;
    if (!userId || !policyId) {
      return res.status(400).json({ message: 'ID de usuario y ID de política son obligatorios.' });
    }
    const readStatus = await Policy.markAsRead(userId, policyId);
    res.status(200).json({ message: 'Política marcada como leída.', readStatus });
  } catch (error) {
    console.error('Error al marcar política como leída:', error);
    res.status(500).json({ message: 'Error interno del servidor al marcar la política como leída.' });
  }
};
