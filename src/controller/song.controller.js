const { pool } = require('../database'); // Importar el pool desde tu archivo database.js
const axios = require("axios");
const {Song} = require ("../models/song")
const { getTrackDetails } = require('../dataset');

const getTracks = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];
    const setId = req.query.setId;
    const query = req.query.query; // Si no se pasa, se obtienen las canciones guardadas

    if (!accessToken) {
      return res.status(401).json({ message: 'Access token missing or invalid' });
    }

    if (!setId) {
      return res.status(400).json({ message: 'Set ID missing' });
    }

    // Obtener las canciones del set actual
    const [setSongs] = await pool.query(
      'SELECT id_song FROM setsong WHERE id_set = ?',
      [setId]
    );
    const setSongIds = setSongs.map(song => song.id_song);

    let tracks = [];

    if (query) {
      // Realizar búsqueda en Spotify si se proporciona un término de búsqueda
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          q: query,
          type: 'track',
          limit: 50,
        },
      });

      tracks = response.data.tracks.items;
    } else {
      // Obtener canciones guardadas del usuario si no hay término de búsqueda
      const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      tracks = response.data.items.map(item => item.track);
    }

    // Filtrar canciones ya presentes en el set
    const filteredTracks = tracks.filter(track => !setSongIds.includes(track.id));

    // Obtener características de audio
    const ids = filteredTracks.map(track => track.id).join(',');
    const audioFeaturesDataset = await getTrackDetails(ids.split(','));

    // Crear instancias de Song
    const songs = filteredTracks.map(track => {
      const audioFeatures = audioFeaturesDataset.find(feature => feature.id === track.id);

      return new Song(
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
    });

    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las canciones' });
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    // Obtener los IDs de canciones ya añadidas al set actual
    const [songsInSet] = await pool.query(
      'SELECT id_song FROM setsong WHERE id_set = ?',
      [setId]
    );
    const spotifySongIds = songsInSet.map((song) => song.id_song);

    // Obtener las canciones de Spotify basadas en sus ids
    const spotifyTrackPromises = spotifySongIds.map((id_spotify) =>
      axios.get(`https://api.spotify.com/v1/tracks/${id_spotify}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    );

    const spotifyTracks = (await Promise.all(spotifyTrackPromises)).map(
      (response) => response.data
    );

    if (!spotifyTracks.length) {
      return res.status(404).json({ message: 'No tracks found for recommendations' });
    }

    // Obtener recomendaciones de Last.fm en paralelo
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
          const spotifySearchPromises = response.data.similartracks.track
            .slice(0, 10)
            .map(async (similarTrack) => {
              try {
                const searchResponse = await axios.get(
                  'https://api.spotify.com/v1/search',
                  {
                    params: {
                      q: `track:${similarTrack.name} artist:${similarTrack.artist.name}`,
                      type: 'track',
                      limit: 1,
                    },
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }
                );

                if (searchResponse.data.tracks.items.length > 0) {
                  const trackData = searchResponse.data.tracks.items[0];
                  if (!spotifySongIds.includes(trackData.id)) {
                    return trackData;
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching Spotify track for ${similarTrack.name}:`,
                  error.message
                );
                return null;
              }
            });

          const searchResults = await Promise.all(spotifySearchPromises);
          return searchResults.filter(Boolean); // Filtrar resultados válidos
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.warn('Rate limit exceeded. Retrying...');
          await sleep(1000); // Espera 1 segundo antes de reintentar
          return getRecommendations(req, res); // Llamada recursiva
        } else {
          console.error(
            `Error fetching recommendations for ${track.name} by ${track.artists[0].name}:`,
            error.message
          );
          return [];
        }
      }
    });

    const allRecommendations = (await Promise.all(recommendationsPromises)).flat();

    // Obtener características de audio para las canciones recomendadas
    const recommendationIds = allRecommendations.map((track) => track.id);
    const audioFeaturesDataset = await getTrackDetails(recommendationIds);

    // Crear instancias de Song con características de audio
    const uniqueRecommendations = Array.from(
      new Set(allRecommendations.map((track) => track.id))
    )
      .map((id) => {
        const track = allRecommendations.find((t) => t.id === id);
        const audioFeatures = audioFeaturesDataset.find((feature) => feature.id === id);

        return new Song(
          track.album.images[0]?.url,
          track.artists.map((artist) => artist.name).join(', '),
          track.duration_ms,
          track.id,
          track.name,
          audioFeatures ? audioFeatures.danceability : null,
          audioFeatures ? audioFeatures.energy : null,
          audioFeatures ? audioFeatures.tempo : null,
          audioFeatures ? audioFeatures.key : null
        );
      })
      .slice(0, 6); // Limitar a 6 canciones

    if (uniqueRecommendations.length === 0) {
      return res.status(404).json({ message: 'No new recommendations available' });
    }

    res.json(uniqueRecommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error.message);
    res.status(500).json({ message: 'Error al obtener recomendaciones' });
  }
};



module.exports = { getTracks, getTrackUrl, getRecommends };

