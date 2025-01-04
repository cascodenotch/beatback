const {pool} = require("../database");
const axios = require("axios");
const {Song} = require ("../models/song")

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

        console.info("Tabla djset actualizada con id_playlist e imagen:", { updateSql, updateValues, updateResult });

        // Respuesta
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
        console.log (ids);

        // Paso 2: Obtener token del usuario desde la base de datos
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
            'Authorization': `Bearer ${token.trim()}`, // Elimina espacios extra
            'Content-Type': 'application/json',
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

        // Rta
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
                mensaje: "No se encontró el set con el id proporcionado",
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
                mensaje: "No se encontró el set con el id proporcionado",
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



module.exports = {addSet, changeTitle, getSet, addSongToSet, getSetSongs, deleteSong, getSetsByUser, deleteSet };