const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "mysql-14b2e1c7-beatcraft.f.aivencloud.com",
    user: process.env.DB_USER || "avnadmin",
    password: process.env.DB_PASSWORD || "AVNS_fCwsxkOkRUpTc3Jouee",
    database: process.env.DB_NAME || "BeatCraft",
    port: process.env.DB_PORT || 10834,
    connectionLimit: 10,
    maxIdle: 10, // Número máximo de conexiones inactivas (opcional)
    idleTimeout: 60000, // Tiempo máximo para una conexión inactiva (opcional)
    queueLimit: 0, // Sin límite en la cola de solicitudes
});

// Usar el método .promise() aquí
const promisePool = pool.promise();

console.log("Conexión con la BBDD Creada");

// Exportar el pool basado en promesas
module.exports = promisePool;
