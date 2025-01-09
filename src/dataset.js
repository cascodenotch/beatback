// const fs = require('fs');
// const csv = require('csv-parser');
// const path = require('path');

// const datasetPath = path.join(__dirname, '../data/tracks.csv');

// async function getTrackDetails(trackIds) {
//     return new Promise((resolve, reject) => {
//         const results = [];
//         fs.createReadStream(datasetPath)
//             .pipe(csv())
//             .on('data', (data) => {
//                 // Verificar si el ID de la canción está en trackIds
//                 if (trackIds.includes(data.id)) {
//                     // Solo agregar los valores necesarios
//                     results.push({
//                         name: data.name,    
//                         id: data.id,                 
//                         tempo: parseFloat(data.tempo),        
//                         key: parseInt(data.key),         
//                         danceability: parseFloat(data.danceability), 
//                         energy: parseFloat(data.energy),
//                         duration: parseFloat (data.duration_ms),
//                         valence: parseFloat(data.valence),
//                     });
//                 }
//             })
//             .on('end', () => resolve(results))  // Resolver la promesa con los resultados
//             .on('error', (err) => reject(err)); // Rechazar si hay un error
//     });
// }

const mysql = require("mysql2");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");

// Configurar la conexión a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || "mysql-14b2e1c7-beatcraft.f.aivencloud.com",
    user: process.env.DB_USER || "avnadmin",
    password: process.env.DB_PASSWORD || "AVNS_fCwsxkOkRUpTc3Jouee",
    database: process.env.DB_NAME || "BeatCraft",
    port: process.env.DB_PORT || 10834,
    connectionLimit: 10,
}).promise();

console.log("Conexión con la BBDD Creada");

// Ruta del archivo CSV

// const datasetPath = path.join(__dirname, '../data', 'tracks.csv');  

// Leer el archivo CSV y cargar los datos en la tabla 'tracks'

// fs.createReadStream(datasetPath)
//     .pipe(csv())
//     .on("data", async (data) => {
//         // Definir la consulta para insertar los datos
//         const query = `
//             INSERT INTO tracks (id, name, tempo, clave, danceability, energy, duration_ms, valence)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;
        
//         // Los valores a insertar en la tabla
//         const values = [
//             data.id,
//             data.name,
//             parseFloat(data.tempo),
//             parseInt(data.key),
//             parseFloat(data.danceability),
//             parseFloat(data.energy),
//             parseFloat(data.duration_ms),
//             parseFloat(data.valence)
//         ];

//         try {
//             // Ejecutar la consulta para insertar los datos
//             await pool.query(query, values);
//             console.log(`Track con id ${data.id} insertado.`);
//         } catch (err) {
//             console.error("Error al insertar datos:", err);
//         }
//     })
//     .on("end", () => {
//         console.log("Archivo CSV cargado correctamente.");
//     })
//     .on("error", (err) => {
//         console.error("Error al leer el archivo CSV:", err);
//     });

// Función para obtener detalles de las pistas desde la base de datos
async function getTrackDetails(trackIds) {
    try {
        // Crear la consulta SQL para obtener los detalles de las pistas por su id
        const query = `
            SELECT id, name, tempo, clave, danceability, energy, duration_ms, valence 
            FROM tracks 
            WHERE id IN (?)
        `;
        
        // Ejecutar la consulta
        const [rows] = await pool.query(query, [trackIds]);

        // Devolver los resultados
        return rows;
    } catch (err) {
        console.error("Error al obtener los detalles de las pistas:", err);
        throw err;
    }
}

// Exportar la función para usarla en otras partes del código
module.exports = { getTrackDetails, pool };
