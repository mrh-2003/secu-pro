const app = require('./app');
const PORT = process.env.PORT_APP || 8080;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
