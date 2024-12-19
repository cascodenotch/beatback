const { pool } = require('../database'); // Importar el pool desde tu archivo database.js
const axios = require("axios");

const getSavedTracks = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1]; // Token del cliente
        const setId = req.query.setId; // ID del set actual (debe ser pasado como query param)

        if (!accessToken) {
            return res.status(401).json({ message: 'Access token missing or invalid' });
        }

        if (!setId) {
            return res.status(400).json({ message: 'Set ID is required' });
        }

        // Obtener los IDs de las canciones ya añadidas al set actual desde la base de datos
        const [songsInSet] = await pool.query(
            'SELECT id_song FROM setsong WHERE id_set = ?',
            [setId]
        );

        const songIdsInSet = songsInSet.map(song => song.id_song);

        // Hacer la solicitud a la API de Spotify para obtener las canciones guardadas
        const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
        });

        // Mapear los resultados para extraer la información que necesitas
        const tracks = response.data.items
            .map(item => {
                const track = item.track;

                return {
                    songId: track.id, // ID de la canción
                    songName: track.name, // Nombre de la canción
                    artistName: track.artists.map(artist => artist.name).join(', '), // Artista(s)
                    durationMs: track.duration_ms, // Duración en milisegundos
                    albumImage: track.album.images[0]?.url // Imagen de la carátula
                };
            })
            .filter(track => !songIdsInSet.includes(track.songId)); // Filtrar las canciones ya añadidas

        // Responder con los datos requeridos
        res.send(tracks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las canciones' });
    }
};

const searchTracks = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1]; // Extraer el token de los headers
    const query = req.query.query; // Obtener el término de búsqueda desde los parámetros
    const setId = req.query.setId; // Obtener el setId desde los parámetros

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    if (!query) {
      return res.status(400).json({ message: 'Search query missing' });
    }

    if (!setId) {
      return res.status(400).json({ message: 'Set ID missing' });
    }

    // Consultar canciones del set actual
    const [setSongs] = await pool.query(
      'SELECT id_song FROM setsong WHERE id_set = ?',
      [setId]
    );

    const setSongIds = setSongs.map(song => song.id_song);

    // Realizar la solicitud a la API de Spotify para buscar canciones
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        q: query, // Término de búsqueda
        type: 'track', // Solo canciones
        limit: 50 // Limitar a 50 resultados
      }
    });

    // Mapear los resultados para extraer la información necesaria
    const tracks = response.data.tracks.items.map(item => {
      return {
        songId: item.id, // ID de la canción
        songName: item.name, // Nombre de la canción
        artistName: item.artists.map(artist => artist.name).join(', '), // Artista(s)
        durationMs: item.duration_ms, // Duración en milisegundos
        albumImage: item.album.images[0]?.url // Imagen de la carátula
      };
    });

    // Filtrar canciones que ya están en el set
    const filteredTracks = tracks.filter(track => !setSongIds.includes(track.songId));

    // Responder con los datos filtrados
    res.send(filteredTracks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar canciones' });
  }
};


module.exports = { getSavedTracks, searchTracks };

