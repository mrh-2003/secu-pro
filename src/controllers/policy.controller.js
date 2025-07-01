const Policy = require('../models/policy.model');
const bucket = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

exports.createPolicy = async (req, res) => {
  try {
    const { title, description, category, iso_clause, classification, status } = req.body;
    let documentPath = null;

    if (!title || !description || !category || !classification || !status) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    if (req.file) {
      const fileName = `${uuidv4()}-${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
        public: true,
        resumable: false
      });
      documentPath = file.publicUrl();
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

    const oldPolicy = await Policy.findById(id);

    if (req.file) {
      if (oldPolicy && oldPolicy.document_path) {
        try {
          const fileNameWithEncoding = oldPolicy.document_path.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Documento de política antiguo ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el documento de política antiguo de Firebase Storage: ${deleteError.message}`);
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
      documentPath = file.publicUrl();
    } else if (req.body.clearDocument === 'true') {
      if (oldPolicy && oldPolicy.document_path) {
        try {
          const fileNameWithEncoding = oldPolicy.document_path.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Documento de política ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el documento de política de Firebase Storage: ${deleteError.message}`);
        }
      }
      documentPath = null;
    } else if (oldPolicy) {
      documentPath = oldPolicy.document_path;
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
      try {
        const fileNameWithEncoding = documentPath.split('/').pop().split('?')[0];
        const fileName = decodeURIComponent(fileNameWithEncoding);
        await bucket.file(fileName).delete();
        console.log(`Documento de política ${fileName} eliminado de Firebase Storage.`);
      } catch (deleteError) {
        console.warn(`No se pudo eliminar el documento de política de Firebase Storage: ${deleteError.message}`);
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