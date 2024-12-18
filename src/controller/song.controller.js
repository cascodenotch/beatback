const axios = require("axios");

const getSavedTracks = async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.split(' ')[1]; // Extraer el token de los headers
        console.log("token: ", accessToken);

        if (!accessToken) {
            return res.status(401).json({ message: 'Access token missing or invalid' });
        }

        // Hacer la solicitud a la API de Spotify para obtener las canciones guardadas
        const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            }
        });

        // Mapear los resultados para extraer la información que necesitas
        const tracks = response.data.items.map(item => {
            const track = item.track; // El track está dentro del objeto `track`

            return {
                songName: track.name, // Nombre de la canción
                artistName: track.artists.map(artist => artist.name).join(', '), // Artista(s)
                durationMs: track.duration_ms, // Duración en milisegundos
                albumImage: track.album.images[0]?.url // Imagen de la carátula (primera imagen del álbum)
            };
        });

        // Responder con los datos requeridos
        res.send(tracks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las canciones' });
    }
};

module.exports = { getSavedTracks };
