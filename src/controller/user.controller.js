const {pool} = require('../database'); // Conexión a la base de datos con promesas
const querystring = require('querystring');
const axios = require('axios');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const REDIRECT_URI = 'http://localhost:3000/spotify/callback'; // Cambiar al dominio de producción si es necesario
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Iniciar autenticación con Spotify
async function spotifyLogin(req, res) {
    const scope = 'user-read-email user-read-private user-library-read playlist-modify-public playlist-modify-private'; // Permisos necesarios

    if (!CLIENT_ID) {
        return res.status(500).send('Missing SPOTIFY_CLIENT_ID environment variable');
    }

    res.redirect(`${SPOTIFY_AUTH_URL}?` +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI,
        })
    );
}

// Guardar usuario en la base de datos después de la autenticación
async function spotifyCallback(req, res) {
    let respuesta; // Variable para almacenar la respuesta
    const code = req.query.code;
    console.log("Código recibido de Spotify:", code);

    if (!code) {
        respuesta = {
            error: true,
            codigo: 400,
            mensaje: 'Código de autorización no recibido',
        };
        return res.status(400).send(respuesta);
    }

    try {
        // Intercambiar el código por el token
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
                },
            }
        );

        const tokenData = tokenResponse.data;
        console.log("Token recibido:", tokenData);

        if (!tokenData.access_token) {
            respuesta = {
                error: true,
                codigo: 500,
                mensaje: 'Error: Token de acceso no encontrado',
            };
            console.error(respuesta.mensaje, tokenData);
            return res.status(500).json(respuesta);
        }

        // Obtener datos del usuario de Spotify
        const userResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userData = userResponse.data;
        console.log("Datos del usuario:", userData);

        // Comprobar si el usuario ya existe en la base de datos usando id_spotify
        const sqlSelectUser = "SELECT id_user FROM user WHERE id_spotify = ?";
        const paramsSelectUser = [userData.id];
        const [existingUser] = await pool.query(sqlSelectUser, paramsSelectUser);

        if (existingUser.length === 0) {
            // Insertar nuevo usuario
            const sqlInsert = `INSERT INTO user (email, photo, id_spotify, token) VALUES (?, ?, ?, ?)`;
            const paramsInsert = [
                userData.email,
                userData.images[0]?.url || "",
                userData.id,
                tokenData.access_token,
            ];
            await pool.query(sqlInsert, paramsInsert);
        } else {
            // Actualizar token del usuario existente
            const sqlUpdate = `UPDATE user SET token = ? WHERE id_spotify = ?`;
            const paramsUpdate = [
                tokenData.access_token,
                userData.id,
            ];
            await pool.query(sqlUpdate, paramsUpdate);
        }

        // Ahora obtenemos el id_user del usuario
        const id_user = existingUser[0].id_user;
        console.log("id_user obtenido de la base de datos:", id_user);

        // Verificar si el usuario tiene sets creados usando id_user
        const sqlSelectSets = "SELECT * FROM djset WHERE id_user = ?";
        const paramsSelectSets = [id_user];  // Usar id_user para consultar los sets
        console.log("Ejecutando consulta de sets con id_user:", id_user);
        const [sets] = await pool.query(sqlSelectSets, paramsSelectSets);

        console.log("Sets encontrados:", sets);

        // Redirigir dependiendo de si el usuario tiene sets
        if (sets.length > 0) {
            console.log("Usuario tiene sets. Redirigiendo a mis-sets.");
            res.redirect(`http://localhost:4200/mis-sets?token=${tokenData.access_token}`);
        } else {
            console.log("Usuario no tiene sets. Redirigiendo a editar-set-vacia.");
            res.redirect(`http://localhost:4200/editar-set-vacia?token=${tokenData.access_token}`);
        }

    } catch (error) {
        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error al autenticar con Spotify',
            detalles: error.message,
        };
        console.error("Error en Spotify Callback:", respuesta);
        res.status(500).json(respuesta);
    }
}



// Obtener datos del usuario basado en el token
async function putUser(request, response) {
    let respuesta; // Declaración de la variable para la respuesta

    try {
        const token = request.body.token;

        if (!token) {
            respuesta = {
                error: true,
                codigo: 400,
                mensaje: 'Token no recibido',
            };
        } else {
            // Obtener datos del usuario desde la base de datos
            const sql = "SELECT id_user, email, photo, id_spotify FROM user WHERE token = ?";
            const params = [token];
            const [userData] = await pool.query(sql, params);

            if (userData.length === 0) {
                respuesta = {
                    error: true,
                    codigo: 404,
                    mensaje: 'Usuario no encontrado',
                };
            } else {
                // Preparar la respuesta con los datos del usuario

                respuesta = {
                    error: false,
                    codigo: 200,
                    mensaje: "Datos del usuario obtenidos correctamente",
                    data: userData[0],
                };
            }
        }
    } catch (error) {
        console.error("Error en putUser:", error.message);

        respuesta = {
            error: true,
            codigo: 500,
            mensaje: 'Error interno del servidor al obtener los datos del usuario',
            detalles: error.message,
        };
    }

    response.send(respuesta); // Enviar la respuesta al cliente
}


module.exports = { spotifyLogin, spotifyCallback, putUser };
