const {pool} = require("../database");
// const spotifyAuth = require("./spotifyAuth");
// const axios = require("axios");

async function addSet (request, response){

    let respuesta; 
    
    try {

        const sql = `INSERT INTO djset (id_user, titulo, imagen) VALUES (?, ?, ?)`;
        const values = [
        request.body.id_user,
        request.body.titulo,
        request.body.imagen,
        ];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en añadir set:", { sql, values, result });

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Set añadido con éxito',
            id_set: result.insertId
        };
    }
        
    catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno añadir set',
            detalles: error.message  
        };
    }

    response.send (respuesta);
}

module.exports = {addSet};