const querystring = require("querystring");
const axios = require("axios");

const client_id = "0186d7c12abc4561bdeec31c8480496a";
const client_secret = "648001fad97c4e5aa3915a5936088db8";
const redirect_uri = "http://localhost:3000/callback"; 

const spotifyAuth = {
  getAuthorizationUrl: () => {
    const scope = "user-read-private user-read-email";
    return `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: "code",
      client_id,
      scope,
      redirect_uri,
    })}`;
  },
  exchangeCodeForToken: async (code) => {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri,
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
    return response.data;
  },
  getUserData: async (accessToken) => {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  },
};

module.exports = spotifyAuth;
