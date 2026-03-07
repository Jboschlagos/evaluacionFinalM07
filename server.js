require("dotenv").config();
const express = require("express");
const app = express();

// Permite leer JSON en el body
app.use(express.json());

// Sirve los archivos del frontend
app.use(express.static("public"));

// Rutas
const paisesRouter = require("./src/routes/paises");
app.use("/paises", paisesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});