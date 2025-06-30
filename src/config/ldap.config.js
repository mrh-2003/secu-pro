require('dotenv').config();
module.exports = {
  BASE_DN: process.env.BASE_DN,
  LDAP_URL: process.env.LDAP_URL,
  LDAP_ADMIN_DN: process.env.LDAP_ADMIN_DN,
  LDAP_ADMIN_PASSWORD: process.env.LDAP_ADMIN_PASSWORD
}; 