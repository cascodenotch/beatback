const {pool} = require("../database");
const axios = require("axios");
const {Song} = require ("../models/song")

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

        const sql = `SELECT * FROM djset WHERE id_set = ?`;
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

async function deleteSong (request, response){

    let respuesta; 
    
    try {

        const sql = `DELETE FROM setsong WHERE id_song = ? AND id_set = ?`;
        const values = [request.body.id_song, request.body.id_set];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en delete song:", { sql, values, result });

        if (result.affectedRows > 0) {
            respuesta = {
                error: false,
                codigo: 200,
                mensaje: 'Canción eliminada con éxito',
            };
        } else {
            respuesta = {
                error: true,
                codigo: 404,
                mensaje: 'No existe ese id de canción o id de set'
            };
        }

    }catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno eliminar cancion',
            detalles: error.message  
        };
    }

    response.send (respuesta);
}

async function getSetSongs (request, response){

    let respuesta; 
    
    try {

        // Paso 1: Obtener los ids de las canciones en el set

        const sql = `SELECT * FROM setsong WHERE id_set = ?`;
        const params = [request.query.id_set];

        const [result] = await pool.query(sql, params);
        console.info("Consulta exitosa en get set songs:", { sql, params, result });

        const idSongsArray = result.map(song => song.id_song);
        console.log (idSongsArray);
        const ids = idSongsArray.join(',');
        console.log (ids);

        // Paso 2: Obtener id_spotify y token del usuario desde la base de datos
        const userQuery = `
        SELECT user.token 
        FROM user 
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?`;
    
        const values2 = [request.query.id_set];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0]?.token;
        console.log(token);

        // Paso 3: Obtener la información de las canciones usando la API 
        const spotifyApiUrl = await axios.get('https://api.spotify.com/v1/tracks', {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        params: {
            ids: ids
        }
        });
        
        // Paso 4: Crear las instancias de Song con los datos de la API
        const songs = spotifyApiUrl.data.tracks.map(track => {
            return new Song(
                track.album.images[0]?.url, 
                track.artists.map(artist => artist.name).join(', '),
                track.duration_ms,           
                track.id,                    
                track.name                   
            );
        });

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Canciones cargadas con éxito',
            songs: songs
    }
        
    }catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno get set songs',
            detalles: error.message  
        };
    }

    response.send (respuesta);
}

async function addSongToSet(request, response) {
    let respuesta;

    try {
        const { setId, songId } = request.body; // Obtenemos el ID del set y el ID de la canción
        // Paso 1: Insertamos la relación entre la canción y el set
        const sql = `INSERT INTO setsong (id_set, id_song) VALUES (?, ?)`;
        const values = [setId, songId];

        const [result] = await pool.query(sql, values);
        console.info("Canción añadida al set con éxito:", { sql, values, result });

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Canción añadida al set con éxito',
            result,
        };

    } catch (error) {
        console.log('Error al añadir canción al set:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno al añadir canción al set',
            detalles: error.message,
        };
    }

    response.send(respuesta);
}

async function getSetsByUser(request, response){
    let respuesta;

    try {
      // Usamos request.params.id_user para acceder al parámetro de la URL
      const sql = `SELECT * FROM djset WHERE id_user = ?`;  // Consulta para obtener los sets de un usuario específico
      const params = [request.params.id_user];  // Accedemos al parámetro de la URL
  
      const [result] = await pool.query(sql, params);  // Ejecutamos la consulta
  
      if (result.length === 0) {
        respuesta = {
          error: false,
          codigo: 404,
          mensaje: 'No se encontraron sets para este usuario',
          sets: []  // En caso de que no haya sets
        };
      } else {
        console.info("Consulta exitosa en getSetsByUser:", { sql, params, result });
        respuesta = {
          error: false,
          codigo: 200,
          mensaje: 'Sets cargados con éxito',
          sets: result  // Resultados de la consulta
        };
      }
    } catch (error) {
      console.log('Error en la consulta SQL:', error);
      respuesta = {
        error: true,
        codigo: 500,
        mensaje: 'Error interno al obtener sets',
        detalles: error.message
      };
    }
  
    response.send(respuesta);  // Enviar la respuesta al cliente
  };

  async function deleteSet(request, response) {
    let respuesta;

    try {
        // Paso 1: Eliminar las canciones asociadas al set
        const deleteSongsSql = `DELETE FROM setsong WHERE id_set = ?`;
        const [songResult] = await pool.query(deleteSongsSql, [request.params.id_set]);
        console.info("Canciones eliminadas del set:", { songResult });

        // Paso 2: Eliminar el set de la base de datos
        const deleteSetSql = `DELETE FROM djset WHERE id_set = ?`;
        const [setResult] = await pool.query(deleteSetSql, [request.params.id_set]);
        console.info("Set eliminado de la base de datos:", { setResult });

        if (setResult.affectedRows > 0) {
            respuesta = {
                error: false,
                codigo: 200,
                mensaje: 'Set eliminado con éxito',
            };
        } else {
            respuesta = {
                error: true,
                codigo: 404,
                mensaje: 'No se encontró el set con el id proporcionado',
            };
        }

    } catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno al eliminar el set',
            detalles: error.message
        };
    }

    response.send(respuesta);
}


module.exports = {addSet, changeTitle, getSet, addSongToSet, getSetSongs, deleteSong, getSetsByUser, deleteSet };