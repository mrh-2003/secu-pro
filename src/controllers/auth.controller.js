const ldap = require("ldapjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");  
const { SECRET, EXPIRES_IN } = require("../config/jwt.config");  
const {
  LDAP_URL,
  BASE_DN,
  LDAP_ADMIN_DN,
  LDAP_ADMIN_PASSWORD,
} = require("../config/ldap.config");

const User = require('../models/user.model');  

function md5Password(password) {
  const hash = crypto.createHash("md5").update(password).digest("hex");
  return `{MD5}${Buffer.from(hash, "hex").toString("base64")}`;
}

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Usuario y contraseña son requeridos" });
  }

  try {
    const users = await User.loginUser(email);  
    if (users.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const userInDB = users[0];  
    const username = userInDB.name;
    const role = userInDB.role;
    const userId = userInDB.id_user;  

    const client = ldap.createClient({ url: LDAP_URL });
    const userDN = `cn=${username},${BASE_DN}`; 

    client.bind(userDN, password, (err) => {
      if (err) {
        console.error("Error de autenticación LDAP:", err.message);
        client.unbind();  
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      client.unbind();  
      const token = jwt.sign(
        { id: userId, username: username, role: role },
        SECRET,
        { expiresIn: EXPIRES_IN }
      );

      return res.json({
        message: "Autenticación exitosa",
        token: token,
        user: {
          id: userId,
          username: username,
          role: role,
        },
      });
    });
  } catch (error) {
    console.error("Error en el proceso de login:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

exports.createUser = (req, res) => {
  const { firstName, lastName, password, role, email, position } = req.body;

  if (!firstName || !lastName || !password || !role || !email || !position) {
    return res.status(400).json({ message: "Faltan campos requeridos" });
  }

  const username = `${firstName} ${lastName}`;
  const client = ldap.createClient({ url: LDAP_URL });
  const userDN = `cn=${username},${BASE_DN}`;
  const userId = `${firstName[0]}${lastName}`.toLowerCase();

  const newUser = {
    cn: username,
    givenName: firstName,
    sn: lastName,
    uid: userId,
    userPassword: md5Password(password),
    uidNumber: 1000,
    gidNumber: 500,
    homeDirectory: `/home/users/${userId}`,
    loginShell: "/bin/bash",
    objectClass: ["inetOrgPerson", "posixAccount", "top"],
  };

  client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD, (err) => {
    if (err) {
      client.unbind();
      return res.status(500).json({ message: "Error de autenticación admin" });
    }

    client.add(userDN, newUser, async (err) => {
      client.unbind();
      if (err) {
        return res.status(500).json({
          message: "Error al crear usuario",
          details: err.message,
        });
      }

      try {
        const usuario = await User.insertUser(username, email, role, position);
        return res.status(201).json({
          message: "Usuario creado correctamente",
          id: usuario.id_user,
        });
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error al crear usuario", error: error.message });
      } 
    });
  });
};
