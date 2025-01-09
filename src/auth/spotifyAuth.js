require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env

const querystring = require("querystring");
const axios = require("axios");

// Usar las variables de entorno en lugar de valores hardcodeados
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // Usar la variable de entorno REDIRECT_URI

const spotifyAuth = {
  // Generar la URL de autorización
  getAuthorizationUrl: () => {
    const scope = "user-read-private user-read-email";
    return `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: "code",
      client_id,
      scope: scope,
      redirect_uri: REDIRECT_URI, // Actualizado para coincidir con la URI de redirección
    })}`;
  },

  // Intercambiar el código de autorización por un token de acceso
  exchangeCodeForToken: async (code) => {
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        querystring.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI, // Asegúrate de que coincida con el registrado
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${client_id}:${client_secret}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return response.data;  // Devuelve el objeto con el token
    } catch (error) {
      console.error("Error al intercambiar el código por el token", error);
      throw new Error('Error al obtener el token');
    }
  },

  // Obtener los datos del usuario
  getUserData: async (accessToken) => {
    try {
      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data; // Devuelve los datos del usuario
    } catch (error) {
      console.error("Error al obtener datos del usuario", error);
      throw new Error('Error al obtener datos del usuario');
    }
  },
};

module.exports = spotifyAuth;
