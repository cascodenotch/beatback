const mysql = require("mysql2");

const pool =  mysql.createPool(
                {
                    host                : "mysql-14b2e1c7-beatcraft.f.aivencloud.com",
                    user                : "avnadmin",
                    password            : "AVNS_fCwsxkOkRUpTc3Jouee",
                    database            : "BeatCraft",
                    waitForConnections  : true,
                    connectionLimit     : 10,
                    maxIdle             : 10, 
                    idleTimeout         : 60000, 
                    queueLimit          : 0
                }).promise();

console.log("Conexión con la BBDD Creada");

module.exports = {pool};