const pool = require('../database'); // Conexión a la base de datos
const querystring = require('querystring');
const axios = require('axios'); // Usamos axios en lugar de fetch

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const REDIRECT_URI = 'http://localhost:3000/spotify/callback'; // Cambiar al dominio de producción si es necesario
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Iniciar autenticación con Spotify
const spotifyLogin = (req, res) => {
    const scope = 'user-read-email user-read-private'; // Permisos necesarios

    // Verifica que process.env.SPOTIFY_CLIENT_ID esté cargado correctamente
    if (!process.env.SPOTIFY_CLIENT_ID) {
        return res.status(500).send('Missing SPOTIFY_CLIENT_ID environment variable');
    }

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
          response_type: 'code',
          client_id: CLIENT_ID,
          scope: scope,
          redirect_uri: REDIRECT_URI,
        }));
};

// Guardar usuario en la base de datos después de la autenticación
const spotifyCallback = async (req, res) => {
    const code = req.query.code;

    console.log("Código recibido de Spotify:", code);  // Verifica el código recibido

    if (!code) {
        return res.status(400).send('Código de autorización no recibido');
    }

    try {
        // Intercambiar el código por el token usando axios
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }), 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(
                        `${CLIENT_ID}:${CLIENT_SECRET}`
                    ).toString('base64')}`,
                },
            }
        );

        if (response.status !== 200) {
            console.error('Error al obtener el token:', response.data);
            return res.status(500).send('Error al intercambiar el código por un token');
        }

        const tokenData = response.data; // El token de acceso recibido
        console.log('Token de acceso recibido:', tokenData);  // Verifica el token recibido

        // Verificar que el token de acceso se está pasando correctamente
        if (!tokenData.access_token) {
            console.error('Token de acceso no encontrado en la respuesta:', tokenData);
            return res.status(500).send('Error: Token de acceso no encontrado');
        }

        // Obtener datos del usuario de Spotify
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        // Verificar si la respuesta es exitosa
        if (userResponse.status !== 200) {
            console.error("Error al obtener los datos del usuario:", userResponse.data);
            throw new Error("Error al obtener los datos del usuario de Spotify");
        }

        console.log("Datos del usuario:", userResponse.data);
        const userData = userResponse.data;

        // Guardar los datos del usuario en la base de datos
        const sql = `INSERT INTO user (email, photo, id_spotify) VALUES (?, ?, ?)`;
        const params = [
            request.body.email,
            request.body.images[0]?.url || "",
            request.body.userId,
        ];
        await pool.query(sql, params);

        res.redirect("http://localhost:4200"); // Redirigir al frontend
    } catch (error) {
        console.error("Error en Spotify Callback:", error.message);
        res.status(500).json({ error: "Error al autenticar con Spotify" });
    }
};


const getUser = async (req, res) => {
    const userId = req.query.spotifyId; // El ID de Spotify debe venir del frontend.

    try {
        const [rows] = await connection.promise().query(
            "SELECT * FROM user WHERE spotifyId = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error al obtener usuario:", error.message);
        res.status(500).json({ error: "Error al obtener usuario" });
    }
};

module.exports = { spotifyLogin, spotifyCallback, getUser };

