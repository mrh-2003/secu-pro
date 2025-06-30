const Asset = require('../models/asset.model');
const camelcaseKeys = require('camelcase-keys').default;

const fs = require('fs');
const path = require('path');

const uploadsDir = path.join('uploads');

exports.createAsset = async (req, res) => {
  try {
    const { name, type, category, description, criticality } = req.body;
    const documentPath = req.file ? req.file.filename : null;

    if (!name || !type || !category || !criticality) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    const newAsset = await Asset.create({ name, type, category, description, criticality, documentPath });
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Error al crear activo:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear el activo.' });
  }
};

exports.getAllAssets = async (req, res) => {
  try {
    const { searchTerm, categoryFilter } = req.query;
    const assets = await Asset.findAll(searchTerm, categoryFilter);
    res.json(camelcaseKeys(assets, { deep: true })); 
  } catch (error) {
    console.error('Error al obtener activos:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener activos.' });
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ message: 'Activo no encontrado.' });
    }
    res.json(camelcaseKeys(asset, { deep: true }));  
  } catch (error) {
    console.error('Error al obtener activo por ID:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener el activo.' });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, category, description, criticality } = req.body;
    let documentPath = req.body.documentPath;  

    if (req.file) { 
      const oldAsset = await Asset.findById(id);
      if (oldAsset && oldAsset.document_path && oldAsset.document_path !== documentPath) {
        const oldFilePath = path.join(uploadsDir, oldAsset.document_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`Archivo antiguo ${oldAsset.document_path} eliminado.`);
        }
      }
      documentPath = req.file.filename;
    } else if (req.body.clearDocument === 'true') {  
      const oldAsset = await Asset.findById(id);
      if (oldAsset && oldAsset.document_path) {
        const oldFilePath = path.join(uploadsDir, oldAsset.document_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log(`Archivo ${oldAsset.document_path} eliminado.`);
        }
      }
      documentPath = null;
    }


    if (!name || !type || !category || !criticality) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes.' });
    }

    const updatedAsset = await Asset.update(id, { name, type, category, description, criticality, documentPath });
    if (!updatedAsset) {
      return res.status(404).json({ message: 'Activo no encontrado para actualizar.' });
    }
    res.json(updatedAsset);
  } catch (error) {
    console.error('Error al actualizar activo:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar el activo.' });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const documentPath = await Asset.delete(id);

    if (documentPath) {
      const filePath = path.join(uploadsDir, documentPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Archivo ${documentPath} eliminado del servidor.`);
      }
    }
    res.status(200).json({ message: 'Activo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar activo:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar el activo.' });
  }
};

exports.getAssignedDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const docs = await Asset.findAssignedDocuments(userId);

    if (docs.length === 0) {
      return res.status(200).json({
        user: { name: 'N/A', position: 'N/A' }, 
        assignedDocuments: []
      });
    }

    const userName = docs[0].user_name;
    const userPosition = docs[0].position;

    const assignedDocuments = docs.map(doc => ({
      assetId: doc.id_asset,
      assetName: doc.asset_name,
      documentType: doc.document_type,
      assignedDate: new Date(doc.assigned_date).toLocaleDateString('es-ES'),
      documentPath: doc.document_path 
    }));

    res.json({
      user: { name: userName, position: userPosition },
      assignedDocuments: assignedDocuments
    });
  } catch (error) {
    console.error('Error al obtener documentos asignados:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener documentos asignados.' });
  }
};

exports.downloadDocument = (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error al descargar el archivo:', err);
        res.status(500).json({ message: 'Error al descargar el archivo.' });
      }
    });
  } else {
    res.status(404).json({ message: 'Archivo no encontrado.' });
  }
};