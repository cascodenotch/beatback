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

        // Paso 1: Obtener la posición de la canción que se eliminará
        const positionQuery = `
        SELECT position 
        FROM setsong 
        WHERE id_set = ? AND id_song = ?
        LIMIT 1`;
        const positionValues = [request.body.id_set, request.body.id_song];
        const [positionResult] = await pool.query(positionQuery, positionValues);

        if (positionResult.length === 0) {
            respuesta = {
                error: true,
                codigo: 404,
                mensaje: 'La canción no existe en el set especificado',
            };
            return response.send(respuesta);
        }

        const position = positionResult[0].position;

        // Paso 2: Eliminar la canción en la bbdd
        const sql = `DELETE FROM setsong WHERE id_song = ? AND id_set = ?`;
        const values = [request.body.id_song, request.body.id_set];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en delete song:", { sql, values, result });

        // Paso 3: Reordenar las posiciones restantes
         const reordenarSql = `
         UPDATE setsong
         SET position = position - 1
         WHERE id_set = ? AND position > ?`;
         const reordenarValues = [request.body.id_set, position];
         const [reordenarResult] = await pool.query(reordenarSql, reordenarValues);

         console.info("Reordenamiento exitoso:", reordenarResult);

        // Paso 4: Obtener token del usuario y el id_playlist desde la base de datos
        const userQuery = `
        SELECT user.token, djset.id_playlist
        FROM user
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?`;

        const values2 = [request.body.id_set];
        const [userResult] = await pool.query(userQuery, values2);
        
        const token = userResult[0].token;
        const id_playlist = userResult[0].id_playlist;
    
        console.info("Token obtenido:", token);
        console.info("ID de la playlist obtenida:", id_playlist);

        // Paso 5: Eliminar la canción usando la API 
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
        const sql = `SELECT * FROM setsong WHERE id_set = ? ORDER BY position ASC`;
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

        // Paso 5: Crear las instancias de Song con los datos de la API
        const songs = spotifyApiUrl.data.tracks.map(track => {
            
            // Buscar las características de audio correspondientes para cada canción desde el dataset
            const audioFeatures = audioFeaturesDataset.find(feature => feature.id === track.id);

            // Crear la instancia de Song
            const song = new Song(
                track.album.images[0]?.url, 
                track.artists.map(artist => artist.name).join(', '), 
                track.duration_ms,
                track.id, 
                track.name, 
                audioFeatures ? audioFeatures.danceability : null,  
                audioFeatures ? audioFeatures.energy : null,  
                audioFeatures ? audioFeatures.tempo : null, 
                audioFeatures ? audioFeatures.key : null, 
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

        // Paso 1: Obtener la posición más alta en el set actual
        const maxPositionQuery = `SELECT MAX(position) AS maxPosition FROM setsong WHERE id_set = ?`;
        const [maxPositionResult] = await pool.query(maxPositionQuery, [setId]);

        const maxPosition = maxPositionResult[0]?.maxPosition || 0; // Si no hay canciones, maxPosition será 0
        const newPosition = maxPosition + 1;

        console.info("Nueva posición calculada:", newPosition);

        // Paso 2: Insertamos la relación entre la canción y el set
        const sql = `INSERT INTO setsong (id_set, id_song, position) VALUES (?, ?, ?)`;
        const values = [setId, songId, newPosition];

        const [result] = await pool.query(sql, values);
        console.info("Canción añadida al set con éxito:", { sql, values, result });

        // Paso 3: Obtener token del usuario y el id_playlist desde la base de datos
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

        // Paso 4: Añadir la canción usando la API 
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

async function reorderSongs(request, response) {
    let respuesta;

    try {
        const { id_set, range_start, insert_before, songs} = request.body;
        console.info (request.body)

        // Paso 1: Obtener el token del usuario y el id_playlist desde la base de datos
        const userQuery = `
        SELECT user.token, djset.id_playlist
        FROM user
        JOIN djset ON user.id_user = djset.id_user
        WHERE djset.id_set = ?;`;
        
        const [userResult] = await pool.query(userQuery, [id_set]);

        const token = userResult[0]?.token;
        const id_playlist = userResult[0]?.id_playlist;

        // Paso 2: Llamar a la API de Spotify para reordenar las canciones
        const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${id_playlist}/tracks`;

        const body = {
            range_start,
            insert_before,
            uris: songs.map(songId => `spotify:track:${songId}`)
        };

        const spotifyResponse = await axios.put(spotifyApiUrl, body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        // Paso 3: actualizar la posición en la BBDD

        // Primero se asigna una posición temporal que no genera conflicto con los valores unicos
        const tempPosition = `UPDATE setsong 
        SET position = position + 1000 
        WHERE id_set = ?`;

        const [tempResult] = await pool.query(tempPosition, [id_set]);

        for (let i = 0; i < songs.length; i++) {
            
            const songId = songs[i]; 
            const position = i + 1; 

            const query = `
            UPDATE setsong
            SET position = ?
            WHERE id_set = ? AND id_song = ?
            `;
    
            const [queryResult] = await pool.query(query, [position, id_set, songId]);
        }

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: 'Canciones reordenadas con éxito',
        };

    } catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno al reordenar set',
            detalles: error.message
        };
    }

    response.send(respuesta);
}

async function setAnalysis (request, response) {

    let respuesta;

    try {
    
  // Paso 1: Obtener los ids de las canciones en el set
    const sql = `SELECT * FROM setsong WHERE id_set = ? ORDER BY position ASC`;
    const params = [request.query.id_set];

    const [result] = await pool.query(sql, params);

    const idSongsArray = result.map(song => song.id_song);
    const ids = idSongsArray.join(',');

   // Paso 3: Obtener las características de audio de la canción del dataset
    const audioFeaturesDataset = await getTrackDetails(ids.split(','));

    const songs = audioFeaturesDataset.map(track => {
        return {
            danceability: track.danceability,
            tempo: track.tempo, 
            duration: track.duration, 
            energy: track.energy, 
            key: track.key,
            valence: track.valence,
        };
        });
    
        console.log (songs);

     // Variables para cálculos
     let totalSongs = 0;
     let totalDuration = 0;
     let totalDanceability = 0;
     let totalTempo = 0;
     let arrayEnergy = [];
     let arrayKey = [];
     let veryLow = 0;
     let Low = 0;
     let Neutral = 0;
     let High = 0; 
     let veryHigh = 0;
     let arrayValence = [];

    // Recorrer las canciones para sumar valores
     for (let song of songs) {
        // Verificar que la canción tenga datos válidos
        if (song.duration && song.danceability && song.tempo && song.energy && song.key) {
            totalSongs++;
            totalDuration += song.duration
            totalDanceability += song.danceability;
            totalTempo += song.tempo;
            arrayEnergy.push(song.energy);
            arrayKey.push (song.key);
        }

        if (song.valence >= 0 && song.valence < 0.2) {
            veryLow++;
        } else if (song.valence >= 0.2 && song.valence < 0.4) {
            Low++;
        } else if (song.valence >= 0.4 && song.valence < 0.6) {
            Neutral++;
        } else if (song.valence >= 0.6 && song.valence < 0.8) {
            High++;
        } else if (song.valence >= 0.8 && song.valence <= 1.0) {
            veryHigh++;
        }

    }

    arrayValence = [veryLow, Low, Neutral, High, veryHigh];


    if (totalSongs === 0) {
        return response.send({
            error: true,
            codigo: 404,
            mensaje: 'No hay canciones válidas con datos en el set',
        });
    }

    // Calcular promedios
    let averageDanceability = totalDanceability / totalSongs;
    let averageTempo = totalTempo / totalSongs;

    respuesta = {
        error: false,
        codigo: 200,
        mensaje: 'Canciones analizadas con éxito',
        data: {
            totalSongs,
            totalDuration, 
            averageDanceability,
            averageTempo,
            arrayEnergy,
            arrayKey,
            arrayValence
        },
    };

    } catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno al analizar set',
            detalles: error.message
        };
    }

    response.send(respuesta);
}


module.exports = {addSet, changeTitle, getSet, addSongToSet, getSetSongs, deleteSong, getSetsByUser, deleteSet, reorderSongs, setAnalysis};