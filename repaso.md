# 📓 Repaso Personal — Módulo 7

### PALASED · Evaluación Final · Jorge Bosch

**Fecha de cierre:** Domingo 8 de marzo de 2026, 15:49

---

## 1. ¿Qué construimos?

Una **API REST** con backend en Node.js que administra una base de datos de países con información demográfica y económica. Se conecta con un **frontend de mapa mundial interactivo** llamado **PALASED** (Plataforma de Análisis Latinoamericano de Estadísticas y Datos).

El proyecto integra todo lo aprendido en el módulo: transacciones, cursor paginado, manejo de errores y frontend funcional que consume la API.

---

## 2. Estructura de la base de datos

Tres tablas relacionadas en PostgreSQL:

```
paises                        paises_pib
─────────────────────         ──────────────────────
nombre  VARCHAR(200) PK ────► nombre  VARCHAR(200) PK + FK
continente VARCHAR(200)       pib_2019  INTEGER
poblacion  INTEGER            pib_2020  INTEGER

paises_data_web
──────────────────────
nombre_pais  VARCHAR (PK)
accion       INTEGER
             0 = país eliminado
             1 = país insertado
```

**Concepto clave — Llave foránea (FK):**
`paises_pib.nombre` apunta a `paises.nombre`. Esto significa que no puede existir un registro en `paises_pib` sin que exista primero en `paises`. Por eso al eliminar, hay que borrar primero de `paises_pib` y después de `paises` — como desatornillar las bisagras antes de quitar la puerta. 🪵

---

## 3. Tecnologías del Backend

### Node.js

Entorno de ejecución que permite usar JavaScript fuera del navegador. Es el motor que hace funcionar el servidor.

### Express

Framework que simplifica la creación de servidores web en Node.js. Con Express definimos las rutas (endpoints) que responden a peticiones HTTP.

```javascript
const express = require("express");
const app = express();
app.listen(3000, () => console.log("Servidor corriendo"));
```

### PostgreSQL

Base de datos relacional donde se almacenan los datos de los países. Es el "almacén" donde guardamos toda la información de forma estructurada y segura.

### pg (node-postgres)

Librería que conecta Node.js con PostgreSQL. Usamos `Pool` para mantener múltiples conexiones reutilizables, y `client` cuando necesitamos transacciones manuales.

```javascript
const { Pool } = require("pg");
const pool = new Pool({ host, port, database, user, password });

// Para transacciones — conexión dedicada
const client = await pool.connect();
```

**Diferencia importante:**

- `pool.query()` → consulta simple, el pool maneja la conexión automáticamente
- `pool.connect()` → conexión dedicada, necesaria para transacciones manuales

### pg-cursor — Lo nuevo del Módulo 7

Un cursor es como un lector que no trae toda la biblioteca de golpe — lee de a poco, en bloques. Sirve para paginar resultados grandes sin saturar la memoria.

```javascript
const Cursor = require("pg-cursor");

// Crear el cursor con la consulta
const cursor = client.query(new Cursor("SELECT * FROM paises ORDER BY nombre"));

// Saltar registros anteriores (offset)
cursor.read(offset, (err) => {
  /* saltar */
});

// Leer el bloque que queremos
cursor.read(limite, (err, rows) => {
  /* usar rows */
});

// Siempre cerrar el cursor al terminar
await cursor.close();
```

### dotenv

Librería que carga las variables del archivo `.env` en `process.env`. Permite guardar credenciales fuera del código.

```javascript
require("dotenv").config();
process.env.DB_PASSWORD; // → lee desde .env
```

### nodemon

Herramienta de desarrollo que reinicia el servidor automáticamente cada vez que guardamos un archivo. Se instala como dependencia de desarrollo.

```bash
npm install --save-dev nodemon
```

---

## 4. Transacciones — BEGIN / COMMIT / ROLLBACK

Una transacción es un grupo de operaciones que deben ejecutarse **todas juntas o ninguna**. Es como instalar una puerta: si no puedes poner las bisagras, tampoco pones la puerta.

```javascript
try {
  await client.query("BEGIN"); // Abrir la transacción

  await client.query("INSERT ..."); // Operación 1
  await client.query("INSERT ..."); // Operación 2

  await client.query("COMMIT"); // Confirmar todo ✅
} catch (error) {
  await client.query("ROLLBACK"); // Si algo falla, deshacer todo ❌
} finally {
  client.release(); // Liberar la conexión siempre
}
```

**¿Cuándo usamos transacciones?**

- En el **POST**: insertar en `paises` + `paises_pib` (deben ir juntos)
- En el **DELETE**: eliminar de `paises_pib` + `paises` (deben ir juntos)

**¿Qué queda fuera de la transacción?**
El registro en `paises_data_web` va separado, dentro de su propio `try/catch`. Si falla, no importa — el país igual se inserta o elimina correctamente.

---

## 5. Endpoints de la API

### GET /paises?limite=5&offset=0

Devuelve países en bloques usando cursor.

```
Request:  GET /paises?limite=5&offset=0
Response: { ok: true, data: [ { nombre, continente, poblacion, pib_2019, pib_2020 } ] }
```

### POST /paises

Agrega un nuevo país. Requiere body JSON con todos los campos.

```
Request:  POST /paises
Body:     { nombre, continente, poblacion, pib_2019, pib_2020 }
Response: { ok: true, mensaje: "País Canada agregado correctamente" }
```

### DELETE /paises/:nombre

Elimina un país por su nombre en la URL.

```
Request:  DELETE /paises/Canada
Response: { ok: true, mensaje: "País Canada eliminado correctamente" }
```

### Formato estándar de respuestas

Todas las respuestas siguen este contrato:

```javascript
// Éxito GET
res.status(200).json({ ok: true, data: rows });

// Éxito POST
res.status(201).json({ ok: true, mensaje: "..." });

// Éxito DELETE
res.status(200).json({ ok: true, mensaje: "..." });

// Error de validación
res
  .status(400)
  .json({ ok: false, mensaje: "Todos los campos son obligatorios" });

// No encontrado
res.status(404).json({ ok: false, mensaje: "País no encontrado" });

// Duplicado
res.status(409).json({ ok: false, mensaje: "El país ya existe" });

// Error interno
res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
```

---

## 6. Manejo de errores importantes

### Error 23505 — Llave duplicada

PostgreSQL lanza este código cuando intentamos insertar un registro con una clave primaria que ya existe.

```javascript
if (error.code === "23505") {
  return res.status(409).json({ ok: false, mensaje: "El país ya existe" });
}
```

### ON CONFLICT DO UPDATE

Cuando `paises_data_web` ya tiene el nombre registrado, en vez de fallar, actualizamos el valor:

```sql
INSERT INTO paises_data_web (nombre_pais, accion)
VALUES ($1, $2)
ON CONFLICT (nombre_pais) DO UPDATE SET accion = $2
```

### client.release()

Siempre en el bloque `finally` — libera la conexión de vuelta al pool aunque haya ocurrido un error. Si olvidamos esto, el pool se queda sin conexiones disponibles.

---

## 7. Tecnologías del Frontend

### HTML5

Estructura de la página. Define el mapa, el panel lateral, las pestañas, los formularios y la tabla.

### CSS3

Estilos visuales del proyecto. Usamos **variables CSS** para mantener la paleta de colores consistente:

```css
:root {
  --navy: #0a1628;
  --cyan: #00c5ff;
  --green: #00a651;
  --red: #e03c3c;
}
```

Técnicas usadas:

- `position: fixed` → header y footer siempre visibles
- `display: grid` → layout mapa + panel lateral
- `calc(100vh - 60px - 32px)` → altura dinámica descontando header y footer
- `animation` y `@keyframes` → efectos de entrada y pulso en los marcadores
- `display: flex` → alineación de elementos dentro del panel

### JavaScript (Vanilla)

Lógica del frontend: peticiones al backend, manipulación del DOM, paginación y control del mapa.

```javascript
// Petición al backend
const res = await fetch("/paises?limite=5&offset=0");
const json = await res.json();

// Petición POST con body JSON
const res = await fetch("/paises", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nombre, continente, poblacion, pib_2019, pib_2020 }),
});
```

### Leaflet.js

Librería JavaScript para mapas interactivos. Se integra vía CDN (no necesita instalación npm).

```javascript
// Inicializar el mapa
const mapa = L.map("map", { center: [20, 0], zoom: 2 });

// Agregar tiles (el diseño visual del mapa)
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
).addTo(mapa);

// Crear un marcador personalizado
const icono = L.divIcon({ html: '<div class="marker-pin"></div>' });
const marker = L.marker([lat, lng], { icon: icono }).addTo(mapa);

// Popup al hacer clic
marker.bindPopup("<h4>Chile</h4>");
```

---

## 8. Herramientas de desarrollo

### VS Code

Editor de código principal. Extensiones usadas:

- **SQLTools** → gestión de bases de datos PostgreSQL directamente desde VS Code
- **Live Server** → previsualización del frontend en tiempo real
- **Thunder Client** → pruebas de endpoints REST (alternativa a Postman)

### Git Bash

Terminal de desarrollo en Windows. Todos los comandos del proyecto se ejecutan aquí.

### Git + GitHub

Control de versiones. Comandos clave del proyecto:

```bash
git init
git add .
git commit -m "mensaje"
git remote add origin <url>
git push -u origin main
```

### Thunder Client

Herramienta para probar los endpoints REST antes de conectar el frontend. Permite enviar peticiones GET, POST, DELETE con body JSON y ver la respuesta.

### nodemon

Reinicia el servidor automáticamente al detectar cambios en los archivos. Solo se usa en desarrollo.

---

## 9. Estructura de archivos del proyecto

```
evaluacion-m07/
├── src/
│   ├── db.js              → Pool de conexión a PostgreSQL
│   └── routes/
│       └── paises.js      → GET, POST, DELETE con cursor y transacciones
├── public/
│   ├── index.html         → Estructura del frontend
│   ├── style.css          → Estilos paleta CEPAL
│   ├── app.js             → Lógica fetch + mapa Leaflet
│   └── img/               → Pantallazos de evidencia
├── server.js              → Punto de entrada del servidor
├── .env                   → Credenciales (nunca a Git)
├── .env.example           → Plantilla vacía (sí a Git)
├── .gitignore             → node_modules/ y .env ignorados
├── package.json           → Dependencias y scripts
└── README.md              → Documentación del proyecto
```

---

## 10. Comandos esenciales del proyecto

```bash
# Instalar dependencias
npm install express pg pg-cursor dotenv
npm install --save-dev nodemon

# Iniciar servidor en desarrollo
npm run dev

# Iniciar servidor en producción
npm start

# Ver estructura del proyecto (excluye node_modules)
find . -not -path './node_modules/*' -not -path './.git/*'

# Listar archivos de una carpeta
ls public/img/
```

---

## 11. Errores frecuentes que resolvimos

| Error                        | Causa                                       | Solución                             |
| ---------------------------- | ------------------------------------------- | ------------------------------------ |
| `net start`: Acceso denegado | Falta permiso de administrador              | Ejecutar terminal como Administrador |
| PostgreSQL no conecta        | Servicio desactivado (CCleaner)             | Reactivar en `services.msc`          |
| `nodemon` no reconocido      | No instalado                                | `npm install --save-dev nodemon`     |
| Error 23505 llave duplicada  | `paises_data_web` ya tenía el nombre        | `ON CONFLICT DO UPDATE`              |
| El footer tapa el contenido  | `height` del layout no descontaba el footer | `calc(100vh - 60px - 32px)`          |

---

## 12. Conceptos clave para recordar

| Concepto                | Explicación rápida                                          |
| ----------------------- | ----------------------------------------------------------- |
| `Pool`                  | Grupo de conexiones reutilizables a PostgreSQL              |
| `client`                | Conexión dedicada, necesaria para transacciones             |
| `cursor`                | Lector que trae datos en bloques, no todo junto             |
| `BEGIN/COMMIT/ROLLBACK` | Todo o nada — si algo falla, se deshace todo                |
| `client.release()`      | Devolver la conexión al pool (siempre en `finally`)         |
| `ON CONFLICT`           | Maneja duplicados sin que la app se caiga                   |
| `Query Object`          | `{ text, values }` — forma segura de parametrizar consultas |
| `$1, $2...`             | Placeholders de pg para valores seguros                     |
| `RETURNING *`           | Devuelve el registro afectado después de INSERT/DELETE      |
| `rowCount`              | Número de filas afectadas por la operación                  |
| `encodeURIComponent()`  | Codifica caracteres especiales en URLs                      |
| `.env`                  | Archivo de credenciales, nunca subir a Git                  |

---

_Documento de repaso personal — Jorge Bosch · Módulo 7 cerrado el 8 de marzo de 2026_
