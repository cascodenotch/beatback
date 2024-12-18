const pool = require('../database'); // Conexión a la base de datos
const querystring = require('querystring');
const axios = require('axios'); // Usamos axios en lugar de fetch

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const REDIRECT_URI = 'http://localhost:3000/spotify/callback'; // Cambiar al dominio de producción si es necesario
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Iniciar autenticación con Spotify
async function spotifyLogin (req, res) {
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
async function spotifyCallback(req, res) {
    const code = req.query.code;
    console.log("Código recibido de Spotify:", code);

    if (!code) {
        return res.status(400).send('Código de autorización no recibido');
    }

    try {
        // Intercambiar el código por el token usando axios
        const response = await axios.post(
            'https://accounts.spotify.com/api/token',
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

        const tokenData = response.data;
        console.log("token: ", tokenData);

        if (!tokenData.access_token) {
            console.error('Token de acceso no encontrado en la respuesta:', tokenData);
            return res.status(500).send('Error: Token de acceso no encontrado');
        }

        // Obtener datos del usuario de Spotify
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = userResponse.data;

        console.log("Datos del usuario:", userData);

        // Guardar los datos del usuario en la base de datos
        const sql = `INSERT INTO user (email, photo, id_spotify, token) VALUES (?, ?, ?, ?)`;
        const params = [
            userData.email,                             
            userData.images[0]?.url || "",             
            userData.id,                               
            tokenData.access_token                     
        ];
        await pool.query(sql, params);

        res.redirect("http://localhost:4200/editar-set-vacia"); // Redirigir al frontend
        console.log("Vinculación exitosa");
    } catch (error) {
        console.error("Error en Spotify Callback:", error.message);
        res.status(500).json({ error: "Error al autenticar con Spotify" });
    }
}




async function getUser(req, res){
    const id_spotify = req.query.id_spotify; // El ID de Spotify debe venir del frontend.

    try {
        const [rows] = await pool.query(
            "SELECT * FROM user WHERE spotifyId = ?",
            [id_spotify]
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

