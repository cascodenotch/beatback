const { pool } = require('../database'); // Importar el pool desde tu archivo database.js
const axios = require("axios");
const {Song} = require ("../models/song")
const { getTrackDetails } = require('../dataset');

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

         // Mapear los resultados para extraer las canciones que no están en el set actual
         const tracks = response.data.items
         .map(item => item.track)
         .filter(track => !songIdsInSet.includes(track.id)); // Filtrar las canciones ya añadidas

        //  Conseguir los ids y concatenarlos para utilizarlos en la funcion get track details
         const idstoFetch = tracks.map(track => track.id);
         const ids = idstoFetch.join(',');
         console.log ("IDs de canciones concatenados:",ids);

         // Obtener las características de audio de la canción del dataset
        const audioFeaturesDataset = await getTrackDetails(ids.split(','));
        console.log("IDs de canciones enviados a getTrackDetails:", ids.split(','));
        console.log("Características de audio obtenidas del dataset:", audioFeaturesDataset);

        // Crear instancias de Song con los datos obtenidos
        const songs = tracks.map(track => {
        
          // Buscar las características de audio correspondientes para cada canción
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
             audioFeatures ? audioFeatures.key : null
         );

         console.log('Song Created:', song); // Para verificar los datos de las canciones
         return song;
     });

      // Responder con los datos requeridos
      res.send(songs);

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

    console.log("Respuesta completa de la API:", response.data);
    console.log("Items de las canciones:", response.data.tracks.items);


        //  Conseguir los ids y concatenarlos para utilizarlos en la funcion get track details
        const tracks = response.data.tracks.items; 
        const idstoFetch = tracks.map(track => track.id);
        const ids = idstoFetch.join(',');
        console.log ("IDs de canciones concatenados:",ids);

        // Obtener las características de audio de la canción del dataset
       const audioFeaturesDataset = await getTrackDetails(ids.split(','));
       console.log("IDs de canciones enviados a getTrackDetails:", ids.split(','));
       console.log("Características de audio obtenidas del dataset:", audioFeaturesDataset);

      // Filtrar canciones que no están en el set
      const filteredTracks = tracks.filter(track => !setSongIds.includes(track.id));

      // Crear instancias de Song con los datos obtenidos
      const songs = filteredTracks.map(track => {
       
      // Buscar las características de audio correspondientes para cada canción
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
            audioFeatures ? audioFeatures.key : null
        );

        console.log('Song Created:', song); // Para verificar los datos de las canciones
        return song;
    });

    // Responder con los datos filtrados
    res.send(songs);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar canciones' });
  }
};

const getTrackUrl = async (req, res) => {
  try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const songId = req.params.songId; // Verificar que el songId está siendo recibido correctamente
      
      if (!accessToken || !songId) {
          return res.status(400).json({ message: 'Access token or song ID missing' });
      }

      // Solicitar a la API de Spotify para obtener la URL de la canción
      const response = await axios.get(`https://api.spotify.com/v1/tracks/${songId}`, {
          headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
          }
      });

      const trackUrl = `https://open.spotify.com/embed/track/${response.data.id}`;
      res.json({ url: trackUrl });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener la URL de la canción' });
  }
};

module.exports = { getSavedTracks, searchTracks, getTrackUrl };

