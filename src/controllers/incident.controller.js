const Incident = require("../models/incident.model");
const User = require("../models/user.model");  
const fs = require("fs");
const path = require("path");

const uploadsDir = path.join("uploads");

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
    const evidencePath = req.file ? req.file.filename : null;

    if (!incident_type || !description || !priority) {
      return res
        .status(400)
        .json({ message: "Tipo, descripción y prioridad son obligatorios." });
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
    console.log(helpDocumentsPath);
 
    if (req.file) { 
      const oldIncident = await Incident.findById(id);
      if (oldIncident && oldIncident.help_documents) {
        const oldFilePath = path.join(uploadsDir, oldIncident.help_documents);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      helpDocumentsPath = req.file.filename;
    } else if (req.body.clearHelpDocument === "true") { 
      const oldIncident = await Incident.findById(id);
      if (oldIncident && oldIncident.help_documents) {
        const oldFilePath = path.join(uploadsDir, oldIncident.help_documents);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      helpDocumentsPath = null;
    } else {
      const currentIncident = await Incident.findById(id);
      helpDocumentsPath = currentIncident
        ? currentIncident.help_documents
        : null;
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
        const evidenceFilePath = path.join(uploadsDir, deletedPaths.evidence);
        if (fs.existsSync(evidenceFilePath)) {
          fs.unlinkSync(evidenceFilePath);
        }
      }
      if (deletedPaths.help_documents) {
        const helpDocsFilePath = path.join(
          uploadsDir,
          deletedPaths.help_documents
        );
        if (fs.existsSync(helpDocsFilePath)) {
          fs.unlinkSync(helpDocsFilePath);
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
