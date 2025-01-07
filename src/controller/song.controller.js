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

      const trackUrl = `https://open.spotify.com/embed/track/${response.data.id}?autoplay=1`;
      res.json({ url: trackUrl });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener la URL de la canción' });
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRecommends = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const setId = req.params.setId;

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    if (!setId) {
      return res.status(400).json({ message: 'Set ID is required' });
    }

    // Obtener los IDs de canciones en el set
    const [songsInSet] = await pool.query(
      'SELECT id_song FROM setsong WHERE id_set = ?',
      [setId]
    );
    const spotifySongIds = songsInSet.map(song => song.id_song);

    // Obtener las canciones de Spotify basadas en sus ids en paralelo
    const spotifyTrackPromises = spotifySongIds.map(id_spotify => axios.get(`https://api.spotify.com/v1/tracks/${id_spotify}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }));

    const spotifyTracks = (await Promise.all(spotifyTrackPromises)).map(response => response.data);

    if (!spotifyTracks.length) {
      return res.status(404).json({ message: 'No tracks found for recommendations' });
    }

    // Obtener recomendaciones de Last.fm en paralelo con manejo de 429
    const recommendationsPromises = spotifyTracks.map(async (track) => {
      try {
        const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'track.getsimilar',
            artist: track.artists[0].name,
            track: track.name,
            api_key: process.env.LASTFM_API_KEY,
            format: 'json',
          },
        });

        if (response.data.similartracks && response.data.similartracks.track) {
          const spotifySearchPromises = response.data.similartracks.track.slice(0, 6).map(async (similarTrack) => {
            try {
              const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
                params: {
                  q: `track:${similarTrack.name} artist:${similarTrack.artist.name}`,
                  type: 'track',
                  limit: 1,
                },
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (searchResponse.data.tracks.items.length > 0) {
                const trackData = searchResponse.data.tracks.items[0];
                if (!spotifySongIds.includes(trackData.id)) {
                  // Aquí puedes obtener las características de audio para cada track
                  const audioFeaturesDataset = await getTrackDetails([trackData.id]);

                  const audioFeatures = audioFeaturesDataset.find(feature => feature.id === trackData.id);

                  // Crear la instancia de Song con los datos de las recomendaciones y las características de audio
                  const song = new Song(
                    trackData.album.images[0]?.url,
                    trackData.artists.map(artist => artist.name).join(', '),
                    trackData.duration_ms,
                    trackData.id,
                    trackData.name,
                    audioFeatures ? audioFeatures.danceability : null,
                    audioFeatures ? audioFeatures.energy : null,
                    audioFeatures ? audioFeatures.tempo : null,
                    audioFeatures ? audioFeatures.key : null
                  );

                  console.log('Song Created:', song); // Para verificar los datos de las canciones
                  return song;
                }
              }
            } catch (error) {
              console.error(`Error fetching Spotify track for ${similarTrack.name}:`, error.message);
              return null;
            }
          });

          // Esperar por todas las búsquedas de Spotify
          const searchResults = await Promise.all(spotifySearchPromises);

          // Filtrar resultados válidos
          return searchResults.filter(Boolean);
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          // Si se recibe un error 429, espera y reintenta
          console.warn('Rate limit exceeded. Retrying...');
          await sleep(1000); // Espera 1 segundo antes de reintentar
          return getRecommends(req, res); // Llamada recursiva
        } else {
          console.error(`Error fetching recommendations for ${track.name} by ${track.artists[0].name}:`, error.message);
          return [];
        }
      }
    });

    // Recoger todas las recomendaciones
    const allRecommendations = (await Promise.all(recommendationsPromises)).flat();

    // Eliminar duplicados y limitar a 6 recomendaciones
    const uniqueRecommendations = Array.from(new Set(allRecommendations.map(JSON.stringify)))
      .map(JSON.parse)
      .slice(0, 6);  // Limitar a 6

    // Responder con los datos de las canciones en el formato correcto
    res.send(uniqueRecommendations);

  } catch (error) {
    console.error('Error fetching recommendations:', error.message);
    res.status(500).json({ message: 'Error al obtener recomendaciones' });
  }
};

let recommendedSongIds = new Set(); // Guardar los IDs de canciones recomendadas

const refreshRecommendations = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const setId = req.params.setId;

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    if (!setId) {
      return res.status(400).json({ message: 'Set ID is required' });
    }

    // Obtener los IDs de canciones ya recomendadas en el set actual
    const [songsInSet] = await pool.query(
      'SELECT id_song FROM setsong WHERE id_set = ?',
      [setId]
    );
    const spotifySongIds = songsInSet.map(song => song.id_song);

    // Obtener las canciones de Spotify basadas en sus ids en paralelo
    const spotifyTrackPromises = spotifySongIds.map(id_spotify =>
      axios.get(`https://api.spotify.com/v1/tracks/${id_spotify}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    );

    const spotifyTracks = (await Promise.all(spotifyTrackPromises)).map(response => response.data);

    if (!spotifyTracks.length) {
      return res.status(404).json({ message: 'No tracks found for recommendations' });
    }

    // Obtener recomendaciones de Last.fm en paralelo
    const recommendationsPromises = spotifyTracks.map(async track => {
      try {
        const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
          params: {
            method: 'track.getsimilar',
            artist: track.artists[0].name,
            track: track.name,
            api_key: process.env.LASTFM_API_KEY,
            format: 'json',
          },
        });

        if (response.data.similartracks && response.data.similartracks.track) {
          const spotifySearchPromises = response.data.similartracks.track.slice(0, 10).map(async similarTrack => {
            try {
              const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
                params: {
                  q: `track:${similarTrack.name} artist:${similarTrack.artist.name}`,
                  type: 'track',
                  limit: 1,
                },
                headers: { Authorization: `Bearer ${accessToken}` },
              });

              if (searchResponse.data.tracks.items.length > 0) {
                const trackData = searchResponse.data.tracks.items[0];
                if (
                  !spotifySongIds.includes(trackData.id) && // No está en el set actual
                  !recommendedSongIds.has(trackData.id) // No se recomendó previamente
                ) {
                  const audioFeaturesDataset = await getTrackDetails([trackData.id]);
                  const audioFeatures = audioFeaturesDataset.find(feature => feature.id === trackData.id);

                  // Crear la instancia de Song con los datos de las recomendaciones y las características de audio
                  const song = new Song(
                    trackData.album.images[0]?.url,
                    trackData.artists.map(artist => artist.name).join(', '),
                    trackData.duration_ms,
                    trackData.id,
                    trackData.name,
                    audioFeatures ? audioFeatures.danceability : null,
                    audioFeatures ? audioFeatures.energy : null,
                    audioFeatures ? audioFeatures.tempo : null,
                    audioFeatures ? audioFeatures.key : null
                  );

                  return song;
                }
              }
            } catch (error) {
              console.error(`Error fetching Spotify track for ${similarTrack.name}:`, error.message);
              return null;
            }
          });

          const searchResults = await Promise.all(spotifySearchPromises);
          return searchResults.filter(Boolean); // Filtrar resultados válidos
        }
      } catch (error) {
        console.error(`Error fetching recommendations for ${track.name} by ${track.artists[0].name}:`, error.message);
        return [];
      }
    });

    const allRecommendations = (await Promise.all(recommendationsPromises)).flat();

    // Filtrar duplicados y agregar las nuevas recomendaciones al historial
    const freshRecommendations = Array.from(new Set(allRecommendations.map(JSON.stringify)))
      .map(JSON.parse)
      .filter(song => !recommendedSongIds.has(song.songId)) // Excluir canciones ya recomendadas
      .slice(0, 6); // Limitar a 6 canciones

    // Actualizar el conjunto de IDs de canciones recomendadas
    freshRecommendations.forEach(song => recommendedSongIds.add(song.songId));

    if (freshRecommendations.length === 0) {
      return res.status(404).json({ message: 'No new recommendations available' });
    }

    res.json(freshRecommendations);
  } catch (error) {
    console.error('Error refreshing recommendations:', error.message);
    res.status(500).json({ message: 'Error al refrescar las recomendaciones' });
  }
};




module.exports = { getSavedTracks, searchTracks, getTrackUrl, getRecommends, refreshRecommendations };

