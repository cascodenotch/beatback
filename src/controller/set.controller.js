const {pool} = require("../database");
const axios = require("axios");
const {Song} = require ("../models/song")
const { getTrackDetails } = require('../dataset');

async function addSet(request, response) {
    let respuesta;

    try {
        // Paso 1: Insertar el set en la base de datos
        const sql = `INSERT INTO djset (id_user, titulo, imagen) VALUES (?, ?, ?)`;
        const values = [
            request.body.id_user,
            request.body.titulo,
            "assets/Img/disc.jpeg", // Valor temporal para la imagen
        ];

        const [result] = await pool.query(sql, values);
        console.info("Consulta exitosa en añadir set:", { sql, values, result });

        const id_set = result.insertId;

        // Paso 2: Obtener id_spotify y token del usuario desde la base de datos
        const userQuery = `SELECT id_spotify, token FROM user WHERE id_user = ?`;
        const values2 = [request.body.id_user];
        const [userResult] = await pool.query(userQuery, values2);

        const id_spotify = userResult[0].id_spotify;
        const token = userResult[0].token;

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

        const playlistId = spotifyResponse.data.id; // ID de la playlist creada
        console.info("Playlist creada en Spotify con ID:", playlistId);

        // Paso 4: Obtener la URL de la imagen de la playlist (si existe)
        const playlistImage = spotifyResponse.data.images.length > 0 
            ? spotifyResponse.data.images[0].url 
            : "assets/Img/disc.jpeg"; // Imagen por defecto si no hay portada

        // Paso 5: Actualizar la tabla `djset` con el id_playlist y la imagen de la playlist
        const updateSql = `UPDATE djset SET id_playlist = ?, imagen = ? WHERE id_set = ?`;
        const updateValues = [playlistId, playlistImage, id_set];
        const [updateResult] = await pool.query(updateSql, updateValues);

        // Rta

        respuesta = {
            error: false,
            codigo: 200,
            mensaje: "Set añadido con éxito y playlist creada en Spotify",
            id_set: result.insertId,
            playlistImage: playlistImage,
        };

    } catch (error) {
        console.log('Error en la consulta SQL:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno añadir set',
            detalles: error.message,
        };
    }

    response.send(respuesta);
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

async function getSetsByUser(request, response) {
    let respuesta;

    try {
        // Paso 1: Obtener los sets del usuario desde la base de datos
        const sql = `SELECT * FROM djset WHERE id_user = ?`;
        const params = [request.params.id_user];

        const [sets] = await pool.query(sql, params);

        if (sets.length === 0) {
            respuesta = {
                error: false,
                codigo: 404,
                mensaje: 'No se encontraron sets para este usuario',
                sets: [],
            };
        } else {
            // Paso 2: Obtener el token del usuario
            const userQuery = `SELECT token FROM user WHERE id_user = ?`;
            const [userResult] = await pool.query(userQuery, [request.params.id_user]);

            if (userResult.length === 0) {
                throw new Error('Usuario no encontrado');
            }

            const token = userResult[0].token;

            // Paso 3: Iterar sobre los sets y actualizar las imágenes si es necesario
            for (const set of sets) {
                if (set.id_playlist) {
                    try {
                        // Llamar a la API de Spotify para obtener la playlist
                        const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${set.id_playlist}`;
                        const spotifyResponse = await axios.get(spotifyApiUrl, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        const playlistData = spotifyResponse.data;
                        const playlistImage = playlistData.images.length > 0 
                            ? playlistData.images[0].url 
                            : null;

                        // Actualizar la imagen en la base de datos si es diferente
                        if (playlistImage && playlistImage !== set.imagen) {
                            const updateSql = `UPDATE djset SET imagen = ? WHERE id_set = ?`;
                            await pool.query(updateSql, [playlistImage, set.id_set]);
                            set.imagen = playlistImage; // Actualizar el objeto en memoria
                        }
                    } catch (error) {
                        console.warn(`Error al obtener la playlist ${set.id_playlist} de Spotify:`, error.message);
                        // Continuar con el siguiente set incluso si hay un error
                    }
                }
            }

            // Paso 4: Preparar la respuesta con los sets actualizados
            console.info("Consulta exitosa en getSetsByUser:", { sql, params, sets });
            respuesta = {
                error: false,
                codigo: 200,
                mensaje: 'Sets cargados con éxito',
                sets: sets,
            };
        }
    } catch (error) {
        console.log('Error en la consulta SQL o API:', error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno al obtener sets',
            detalles: error.message,
        };
    }

    response.send(respuesta);
}

  async function deleteSet(request, response) {
    let respuesta;

    try {
        // Paso 1: Obtener token y id_playlist desde la base de datos
        const query = `
            SELECT u.token, d.id_playlist
            FROM user u
            INNER JOIN djset d ON u.id_user = d.id_user
            WHERE d.id_set = ?
        `;
        const [result] = await pool.query(query, [request.params.id_set]);

        if (result.length === 0) {
            return response.send({
                error: true,
                codigo: 404,
                mensaje: 'No se encontró el set con el id proporcionado',
            });
        }

        const { token, id_playlist } = result[0];

        // Paso 2: Eliminar la playlist de Spotify si tiene una id_playlist válida
        if (id_playlist) {
            const spotifyApiUrl = `https://api.spotify.com/v1/playlists/${id_playlist}/followers`;

            try {
                await axios.delete(spotifyApiUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                console.info("Playlist eliminada de Spotify:", id_playlist);
            } catch (error) {
                console.error("Error al eliminar la playlist de Spotify:", error.message);
            }
        }

        // Paso 3: Eliminar las canciones asociadas al set
        const deleteSongsSql = `DELETE FROM setsong WHERE id_set = ?`;
        const [songResult] = await pool.query(deleteSongsSql, [request.params.id_set]);
        console.info("Canciones eliminadas del set:", { songResult });

        // Paso 4: Eliminar el set de la base de datos
        const deleteSetSql = `DELETE FROM djset WHERE id_set = ?`;
        const [setResult] = await pool.query(deleteSetSql, [request.params.id_set]);
        console.info("Set eliminado de la base de datos:", { setResult });

        if (setResult.affectedRows > 0) {
            respuesta = {
                error: false,
                codigo: 200,
                mensaje: "Set eliminado con éxito y playlist eliminada de Spotify",
            };
        } else {
            respuesta = {
                error: true,
                codigo: 404,
                mensaje: 'No se encontró el set con el id proporcionado'
            };
        }

    } catch (error) {
        console.error("Error en la consulta SQL o en la eliminación:", error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: "Error interno al eliminar el set",
            detalles: error.message,
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
        console.error("Error en la consulta SQL o en la eliminación:", error);
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: "Error interno al eliminar el set",
            detalles: error.message,
        };
    }

    response.send(respuesta);
}


module.exports = {addSet, changeTitle, getSet, addSongToSet, getSetSongs, deleteSong, getSetsByUser, deleteSet, reorderSongs};