// const mysql = require("mysql2");

// const pool = mysql.createPool({
//     host: process.env.DB_HOST || "mysql-14b2e1c7-beatcraft.f.aivencloud.com",
//     user: process.env.DB_USER || "avnadmin",
//     password: process.env.DB_PASSWORD || "AVNS_fCwsxkOkRUpTc3Jouee",
//     database: process.env.DB_NAME || "BeatCraft",
//     port: process.env.DB_PORT || 10834,
//     connectionLimit: 10,
// }).promise();

// console.log("Conexión con la BBDD Creada");

// async function getTrackDetails(trackIds) {
//     try {
//         const query = `
//             SELECT id, name, tempo, clave, danceability, energy, duration_ms, valence 
//             FROM tracks 
//             WHERE id IN (?)
//         `;
        
//         const [rows] = await pool.query(query, [trackIds]);

//         return rows;
//     } catch (err) {
//         console.error("Error al obtener los detalles de las pistas:", err);
//         throw err;
//     }
// }

// module.exports = { getTrackDetails, pool };

// CODIGO UTILIZADO PARA COPIAR CSV EN BBDD

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

