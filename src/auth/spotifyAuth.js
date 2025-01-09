const querystring = require("querystring");
const axios = require("axios");

const client_id = "0186d7c12abc4561bdeec31c8480496a";
const client_secret = "648001fad97c4e5aa3915a5936088db8";
const REDIRECT_URI = 'https://beatfront-cascodenotchs-projects.vercel.app/spotify/callback'; // Asegúrate de que sea la URL correcta

const spotifyAuth = {
  // Generar la URL de autorización
  getAuthorizationUrl: () => {
    const scope = "user-read-private user-read-email";
    return `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: "code",
      client_id,
      scope:scope,
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
