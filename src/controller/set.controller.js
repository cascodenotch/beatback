const {pool} = require("../database");
const axios = require("axios");

async function addSet (request, response){

    let respuesta; 
    
    try {
        
        // Paso 1: Insertar el set en la base de datos
        const sql = `INSERT INTO djset (id_user, titulo, imagen) VALUES (?, ?, ?)`;
        const values = [
            request.body.id_user,
            request.body.titulo,
            request.body.imagen,
        ];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en añadir set:", { sql, values, result });

        // Paso 2: Obtener id_spotify y token del usuario desde la base de datos
        const userQuery = `SELECT id_spotify, token FROM user WHERE id_user = ?`;
        const values2 = [request.body.id_user];
        const [userResult] = await pool.query(userQuery,values2);

        const id_spotify = userResult[0].id_spotify;
        console.log (id_spotify);
        const token = userResult[0].token;
        console.log(token);

        // Paso 3: Crear la playlist en Spotify usando la API
        const spotifyApiUrl = `https://api.spotify.com/v1/users/${id_spotify}/playlists`;

        const playlistData = {
            name: request.body.titulo,
            description: "Playlist creada desde la app DJ",
            public: false,
        };

        const spotifyResponse = await axios.post(spotifyApiUrl, playlistData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        console.info("Playlist creada en Spotify:", spotifyResponse.data);

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: "Set añadido con éxito y playlist creada en Spotify",
            id_set: result.insertId,
        };

    }catch (error) {
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

async function changeTitle (request, response){

    let respuesta; 
    
    try {

        const sql = `UPDATE djset 
        SET titulo = COALESCE (?, titulo)
        WHERE id_set = ?`;
        const values = [
        request.body.titulo,
        request.body.id_set,
        ];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en cambiar titulo:", { sql, values, result });

        if (result.affectedRows > 0){
            respuesta = {
                error: false,
                codigo: 200,
                mensaje: 'Titulo cambiado con éxito',
                djset_title: request.body.titulo || 'No proporcionado (mantiene el anterior)'
            };
        } else {
            respuesta = {
                error: true,
                codigo: 404,
                mensaje: 'No se encontró un djset con ese id o no se realizaron cambios en el título',
            };
        }
    } catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno cambiar título',
            detalles: error.message  
        };
    }

    response.send (respuesta);
}

async function getSet (request, response){

    let respuesta; 
    
    try {

        const sql = `SELECT * FROM djset
        WHERE id_set = ?`;
        const params = [request.query.id_set];

        const [result] = await pool.query(sql, params);
        console.info("Consulta exitosa en get set:", { sql, params, result });

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Set cargado con éxito',
            set: result[0]
        };
    }
        
    catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno get set',
            detalles: error.message  
        };
    }

    response.send (respuesta);
}

module.exports = {addSet, changeTitle, getSet};