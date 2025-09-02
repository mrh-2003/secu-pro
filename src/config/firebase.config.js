const admin = require('firebase-admin');
 
//const serviceAccount = require('../../firebase-key.json'); 
const serviceAccount = require('/etc/secrets/firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://secupro-28b31.firebasestorage.app'
});

const bucket = admin.storage().bucket();

module.exports = bucket;