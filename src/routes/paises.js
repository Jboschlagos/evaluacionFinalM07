const express = require("express");
const router = express.Router();
const pool = require("../db");
const Cursor = require("pg-cursor");

// ─────────────────────────────────────────
// GET /paises?limite=5&offset=0
// Entrega países en bloques usando cursor
// ─────────────────────────────────────────
router.get("/", async (req, res) => {
    const limite = parseInt(req.query.limite) || 5;
    const offset = parseInt(req.query.offset) || 0;

    const client = await pool.connect();

    try {
        // El cursor lee los datos de a poco, como un lector que avanza página por página
        const cursor = client.query(
            new Cursor(`
        SELECT p.nombre, p.continente, p.poblacion,
               pp.pib_2019, pp.pib_2020
        FROM paises p
        JOIN paises_pib pp ON p.nombre = pp.nombre
        ORDER BY p.nombre
      `)
        );

        // Saltamos los registros anteriores (offset)
        if (offset > 0) {
            await new Promise((resolve, reject) => {
                cursor.read(offset, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

        // Leemos el bloque que nos piden
        const rows = await new Promise((resolve, reject) => {
            cursor.read(limite, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        await cursor.close();

        res.status(200).json({ ok: true, data: rows });
    } catch (error) {
        console.error("Error en GET /paises:", error.message);
        res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    } finally {
        client.release();
    }
});

router.post("/", async (req, res) => {
    const { nombre, continente, poblacion, pib_2019, pib_2020 } = req.body;

    if (!nombre || !continente || !poblacion || !pib_2019 || !pib_2020) {
        return res.status(400).json({
            ok: false,
            mensaje: "Todos los campos son obligatorios",
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Insertar en paises
        await client.query({
            text: "INSERT INTO paises (nombre, continente, poblacion) VALUES ($1, $2, $3)",
            values: [nombre, continente, poblacion],
        });

        // 2. Insertar en paises_pib
        await client.query({
            text: "INSERT INTO paises_pib (nombre, pib_2019, pib_2020) VALUES ($1, $2, $3)",
            values: [nombre, pib_2019, pib_2020],
        });

        await client.query("COMMIT"); // ← este faltaba

        // 3. Intentar registrar en paises_data_web (fuera de la transacción)
        try {
            await pool.query({
                text: "INSERT INTO paises_data_web (nombre_pais, accion) VALUES ($1, $2) ON CONFLICT (nombre_pais) DO UPDATE SET accion = $2",
                values: [nombre, 1],
            });
        } catch (webError) {
            console.warn("No se pudo registrar en paises_data_web:", webError.message);
        }

        res.status(201).json({
            ok: true,
            mensaje: `País ${nombre} agregado correctamente`,
        });

    } catch (error) { // ← este faltaba
        await client.query("ROLLBACK");
        console.error("Error en POST /paises:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                ok: false,
                mensaje: `El país ${nombre} ya existe`,
            });
        }

        res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────
// DELETE /paises/:nombre
// Elimina un país con transacción
// ─────────────────────────────────────────
// DELETE /paises/:nombre
router.delete("/:nombre", async (req, res) => {
    const { nombre } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Eliminar de paises_pib primero (llave foránea)
        await client.query({
            text: "DELETE FROM paises_pib WHERE nombre = $1",
            values: [nombre],
        });

        // 2. Eliminar de paises
        const { rowCount } = await client.query({
            text: "DELETE FROM paises WHERE nombre = $1",
            values: [nombre],
        });

        if (rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                ok: false,
                mensaje: `País ${nombre} no encontrado`,
            });
        }

        await client.query("COMMIT");

        // 3. Intentar registrar en paises_data_web (separado, no afecta la transacción)
        try {
            await pool.query({
                text: "INSERT INTO paises_data_web (nombre_pais, accion) VALUES ($1, $2) ON CONFLICT (nombre_pais) DO UPDATE SET accion = $2",
                values: [nombre, 0],
            });
        } catch (webError) {
            console.warn("No se pudo registrar en paises_data_web:", webError.message);
        }

        res.status(200).json({
            ok: true,
            mensaje: `País ${nombre} eliminado correctamente`,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error en DELETE /paises:", error.message);
        res.status(500).json({ ok: false, mensaje: "Error interno del servidor" });
    } finally {
        client.release();
    }
});

module.exports = router;