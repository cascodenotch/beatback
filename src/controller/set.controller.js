const {pool} = require("../database");
const axios = require("axios");
const {Song} = require ("../models/song")
const { getTrackDetails } = require('../dataset');

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

        const id_set = result.insertId; 

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

        // Paso 4 capturar la id de la playlist en spotify
        const playlistId = spotifyResponse.data.id; // ID de la playlist creada
        console.info("Playlist creada en Spotify con ID:", playlistId);

        // Paso 5 añadir id de la playlist en bbdd
        const updateSql = `UPDATE djset SET id_playlist = ? WHERE id_set = ?`;
        const updateValues = [playlistId, id_set];
        const [updateResult] = await pool.query(updateSql, updateValues);
        console.info("Tabla djset actualizada con id_playlist:", { updateSql, updateValues, updateResult });

        // Rta

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

        // Paso 1: Cambiar titulo en la BBDD
        const sql = `UPDATE djset 
        SET titulo = COALESCE (?, titulo)
        WHERE id_set = ?`;
        const values = [
        request.body.titulo,
        request.body.id_set,
        ];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en cambiar titulo:", { sql, values, result });

        // Paso 2: Obtener token del usuario y el id_playlist desde la base de datos
        const userQuery = `
        SELECT user.token, djset.id_playlist
        FROM user
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?;`;

        const values2 = [request.body.id_set];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0].token;
        const id_playlist = userResult[0].id_playlist;
    
        console.info("Token obtenido:", token);
        console.info("ID de la playlist obtenida:", id_playlist);

        // Paso 3: Cambiar titulo usando la API 
        const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${id_playlist}`;
        const spotifyResponse = await axios.put(spotifyApiUrl, {
            name: request.body.titulo, // Cuerpo de la solicitud
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        console.info("Spotify API Response:", spotifyResponse.data);

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
    
    }catch (error) {
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

        // Paso 1: Eliminar la canción en la bbdd
        const sql = `DELETE FROM setsong WHERE id_song = ? AND id_set = ?`;
        const values = [request.body.id_song, request.body.id_set];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en delete song:", { sql, values, result });

        // Paso 2: Obtener token del usuario y el id_playlist desde la base de datos
        const userQuery = `
        SELECT user.token, djset.id_playlist
        FROM user
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?;`;

        const values2 = [request.body.id_set];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0].token;
        const id_playlist = userResult[0].id_playlist;
    
        console.info("Token obtenido:", token);
        console.info("ID de la playlist obtenida:", id_playlist);

        // Paso 3: Eliminar la canción usando la API 
        const trackUri = `spotify:track:${request.body.id_song}`; // ID de la canción a eliminar en formato URI

        const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${id_playlist}/tracks`;
        const deleteBody = {
            tracks: [{ uri: trackUri }],
        };
        const spotifyResponse = await axios.delete(spotifyApiUrl, {
            headers: {
                'Authorization': `Bearer ${token.trim()}`,
                'Content-Type': 'application/json',
            },
            data: deleteBody,
        });

        console.info("Spotify API Response:", spotifyResponse.data);

        // Rta

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
        console.log ("IDs de canciones concatenados:",ids);

        // Paso 2: Obtener token del usuario desde la base de datos
        const userQuery = `
        SELECT user.token 
        FROM user 
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?`;
    
        const values2 = [request.query.id_set];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0]?.token;
        console.log("Token de usuario obtenido:",token);

        // Paso 3: Obtener las características de audio de la canción del dataset
        const audioFeaturesDataset = await getTrackDetails(ids.split(','));
        console.log("Características de audio obtenidas del dataset:", audioFeaturesDataset);

        // Paso 4: Obtener la información general de las canciones usando la API 
        const spotifyApiUrl = await axios.get('https://api.spotify.com/v1/tracks', {
        headers: {
            'Authorization': `Bearer ${token.trim()}`, // Elimina espacios extra
            'Content-Type': 'application/json',
        },
        params: {
            ids: ids
        }
        });

        // console.log("Respuesta de Spotify:", spotifyApiUrl.data);

        // Paso 5: Crear las instancias de Song con los datos de la API
        const songs = spotifyApiUrl.data.tracks.map(track => {
            
            // Buscar las características de audio correspondientes para cada canción desde el dataset
            const audioFeatures = audioFeaturesDataset.find(feature => feature.id === track.id);

            // Formatear la duración, energía y otros valores
            const formattedDuration = formatDuration(track.duration_ms);
            const conversionKey = audioFeatures ? convertKeyToPitch(audioFeatures.key) : null;

            // Crear la instancia de Song
            const song = new Song(
                track.album.images[0]?.url, 
                track.artists.map(artist => artist.name).join(', '), 
                formattedDuration, 
                track.id, 
                track.name, 
                audioFeatures ? audioFeatures.danceability : null,  
                audioFeatures ? audioFeatures.energy : null,  
                audioFeatures ? audioFeatures.tempo : null, 
                conversionKey 
            );
                
            // Imprimir el objeto song creado para ver todos sus datos
            console.log('Song Created:', song);
        
            // Devolver el objeto song
            return song;
        });
        
        // Rta
        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Canciones cargadas con éxito',
            songs: songs
    }

    }catch (error) {
        console.log("Error en el proceso de getSetSongs:", error);
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

        // Paso 2: Obtener token del usuario y el id_playlist desde la base de datos
        const userQuery = `
        SELECT user.token, djset.id_playlist
        FROM user
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?;`;

        const values2 = [request.body.setId];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0]?.token;
        const id_playlist = userResult[0]?.id_playlist;
    
        console.info("Token obtenido:", token);
        console.info("ID de la playlist obtenida:", id_playlist);

        // Paso 3: Añadir la canción usando la API 
        const trackUri = `spotify:track:${songId}`; // ID de la canción a añadir en formato URI

        const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${id_playlist}/tracks`;
        const addBody = {
            uris: [trackUri], 
        };
        const spotifyResponse = await axios.post(spotifyApiUrl, addBody, {
            headers: {
                'Authorization': `Bearer ${token.trim()}`,
                'Content-Type': 'application/json',
            },
        });

        console.info("Spotify API Response:", spotifyResponse.data);

        // Rta

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

// Funciones de formateo
function formatDuration(durationMs) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = ((durationMs % 60000) / 1000).toFixed(0);
    return `${minutes}:${(parseInt(seconds) < 10 ? '0' : '') + seconds}`;
}

function convertKeyToPitch(key) {
const pitches = [
    "C", "C#", "D", "D#", "E", "F", "F#",
    "G", "G#", "A", "A#", "B"
];
return pitches[key % 12];  // Asegura que el valor esté en el rango 0-11
}

module.exports = {addSet, changeTitle, getSet, addSongToSet, getSetSongs, deleteSong, getSetsByUser, deleteSet };