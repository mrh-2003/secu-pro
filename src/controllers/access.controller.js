const User = require("../models/user.model");
const Asset = require("../models/asset.model");  
const Access = require("../models/access.model");

exports.getUsersWithAccesses = async (req, res) => {
  try {
    const usersWithAccesses = await Access.findUserAccesses();
    res.json(
      (usersWithAccesses || []).map((user) => {
        const assets = user.assigned_assets || [];
        return {
          id: user.id_user,
          user: user.user_name,
          position: user.position,
          permissions:
            assets.length > 0
              ? assets.map((asset) => asset.asset_name).join(", ")
              : "Ninguno",
          assignedDate:
            assets.length > 0
              ? new Date(assets[0].assigned_date).toLocaleDateString("es-ES")
              : null,
        };
      })
    );
  } catch (error) {
    console.error("Error al obtener usuarios con accesos:", error);
    res
      .status(500)
      .json({
        message: "Error interno del servidor al obtener la lista de accesos.",
      });
  }
};

exports.getUserAccessDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const assignedAccesses = await Access.findAccessesByUserId(userId);
    const availableAssets = await Asset.findAll();  

    res.json({
      user: {
        id: user.id_user,
        name: user.name,
        position: user.position,
      },
      assignedAssets: assignedAccesses.map((access) => ({
        id: access.asset_id,
        name: access.asset_name,
        assigned_date: new Date(access.assigned_date).toLocaleDateString(
          "es-ES"
        ),
      })),
      availableAssets: availableAssets.map((asset) => ({
        id: asset.id_asset,
        name: asset.name,
        description: asset.description,
        criticality: asset.criticality,
        category: asset.category,
      })),
    });
  } catch (error) {
    console.error("Error al obtener detalles de acceso del usuario:", error);
    res
      .status(500)
      .json({
        message: "Error interno del servidor al obtener detalles de acceso.",
      });
  }
};

exports.assignRemoveAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { assetIdsToAssign, assetIdsToRemove } = req.body;

    if (assetIdsToAssign && assetIdsToAssign.length > 0) {
      for (const assetId of assetIdsToAssign) {
        await Access.assignAccess(userId, assetId);
      }
    }

    if (assetIdsToRemove && assetIdsToRemove.length > 0) {
      for (const assetId of assetIdsToRemove) {
        await Access.removeAccess(userId, assetId);
      }
    }
 
    const updatedAccesses = await Access.findAccessesByUserId(userId);
    res.json({ message: "Accesos actualizados con éxito.", updatedAccesses });
  } catch (error) {
    console.error("Error al asignar/remover acceso:", error);
    res
      .status(500)
      .json({ message: "Error interno del servidor al actualizar accesos." });
  }
};
