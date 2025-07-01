const Incident = require("../models/incident.model");
const User = require("../models/user.model");
const bucket = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

exports.createIncident = async (req, res) => {
  try {
    const {
      incident_type,
      description,
      priority,
      possible_causes,
      additional_message,
      assigned_to_id,
    } = req.body;
    let evidencePath = null;

    if (!incident_type || !description || !priority) {
      return res
        .status(400)
        .json({ message: "Tipo, descripción y prioridad son obligatorios." });
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
      evidencePath = file.publicUrl();
    }

    const assignedTo = assigned_to_id ? parseInt(assigned_to_id) : null;

    const newIncident = await Incident.create({
      incident_type,
      description,
      priority,
      possible_causes,
      additional_message,
      evidence: evidencePath,
      assigned_to: assignedTo,
    });
    res.status(201).json(newIncident);
  } catch (error) {
    console.error("Error al crear incidente:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al crear incidente." });
  }
};

exports.getAllIncidents = async (req, res) => {
  try {
    const { searchTerm, statusFilter } = req.query;
    const incidents = await Incident.findAll(searchTerm, statusFilter);
    res.json(incidents);
  } catch (error) {
    console.error("Error al obtener incidentes:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al obtener incidentes." });
  }
};

exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ message: "Incidente no encontrado." });
    }

    if (typeof incident.help_links === 'string') {
      try {
        incident.help_links = JSON.parse(incident.help_links);
      } catch (e) {
        console.warn("No se pudo convertir help_documents a arreglo:", e);
        incident.help_links = [];
      }
    }

    res.json(incident);
  } catch (error) {
    console.error("Error al obtener incidente por ID:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al obtener el incidente." });
  }
};

exports.updateIncidentSolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { solution, help_links, assigned_to_id, status } = req.body;
    let helpDocumentsPath = req.body.help_documents_path;

    const oldIncident = await Incident.findById(id);

    if (req.file) {
      if (oldIncident && oldIncident.help_documents) {
        try {
          const fileNameWithEncoding = oldIncident.help_documents.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Documento de ayuda antiguo ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el documento de ayuda antiguo de Firebase Storage: ${deleteError.message}`);
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
      helpDocumentsPath = file.publicUrl();
    } else if (req.body.clearHelpDocument === "true") {
      if (oldIncident && oldIncident.help_documents) {
        try {
          const fileNameWithEncoding = oldIncident.help_documents.split('/').pop().split('?')[0];
          const oldFileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(oldFileName).delete();
          console.log(`Documento de ayuda ${oldFileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el documento de ayuda de Firebase Storage: ${deleteError.message}`);
        }
      }
      helpDocumentsPath = null;
    } else if (oldIncident) {
      helpDocumentsPath = oldIncident.help_documents;
    }

    const validStatuses = ["Abierto", "Cerrado"];
    if (!status || !validStatuses.includes(status)) {
      return res
        .status(400)
        .json({
          message:
            'El estado del incidente es inválido. Debe ser "Abierto" o "Cerrado".',
        });
    }

    let parsedHelpLinks = null;
    if (help_links) {
      try {
        const linksArray = JSON.parse(help_links);
        if (
          Array.isArray(linksArray) &&
          linksArray.every((link) => typeof link === "string")
        ) {
          parsedHelpLinks = JSON.stringify(
            linksArray.filter((link) => link.trim() !== "")
          );
        } else {
          console.warn(
            "Help_links no es un array de strings válido o no pudo ser parseado. Se establecerá a null."
          );
          parsedHelpLinks = null;
        }
      } catch (e) {
        console.warn(
          "Error parsing help_links from request body, setting to null:",
          e
        );
        parsedHelpLinks = null;
      }
    }

    const updatedIncident = await Incident.updateSolution(id, {
      solution,
      help_links: parsedHelpLinks,
      help_documents: helpDocumentsPath,
      assigned_to: assigned_to_id ? parseInt(assigned_to_id) : null,
      status: status,
    });

    if (!updatedIncident) {
      return res
        .status(404)
        .json({ message: "Incidente no encontrado para actualizar." });
    }
    res.json(updatedIncident);
  } catch (error) {
    console.error("Error al actualizar solución de incidente:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al actualizar solución." });
  }
};

exports.deleteIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPaths = await Incident.delete(id);

    if (deletedPaths) {
      if (deletedPaths.evidence) {
        try {
          const fileNameWithEncoding = deletedPaths.evidence.split('/').pop().split('?')[0];
          const fileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(fileName).delete();
          console.log(`Evidencia ${fileName} eliminada de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar la evidencia de Firebase Storage: ${deleteError.message}`);
        }
      }
      if (deletedPaths.help_documents) {
        try {
          const fileNameWithEncoding = deletedPaths.help_documents.split('/').pop().split('?')[0];
          const fileName = decodeURIComponent(fileNameWithEncoding);
          await bucket.file(fileName).delete();
          console.log(`Documento de ayuda ${fileName} eliminado de Firebase Storage.`);
        } catch (deleteError) {
          console.warn(`No se pudo eliminar el documento de ayuda de Firebase Storage: ${deleteError.message}`);
        }
      }
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar incidente:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al eliminar incidente." });
  }
};

exports.getEmployeesForAssignment = async (req, res) => {
  try {
    const employees = await User.findAll();
    const assignableEmployees = employees.filter(
      (user) => user.role === "Empleado"
    );
    res.json(assignableEmployees.map((e) => ({ id: e.id_user, name: e.name })));
  } catch (error) {
    console.error("Error al obtener empleados para asignación:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};