const app = require('./app');
const PORT = process.env.PORT_APP || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
