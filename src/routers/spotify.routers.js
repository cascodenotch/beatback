const express = require('express');
const spotifyAuth = require('../auth/spotifyAuth');  // Asegúrate de importar el archivo correctamente
const router = express.Router();

// Ruta para manejar el callback de Spotify
router.get('/spotify/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: 'Código de autorización faltante' });
  }

  try {
    // Intercambiar el código por el token
    const tokenData = await spotifyAuth.exchangeCodeForToken(code);
    
    console.log('Token de acceso recibido:', tokenData);

    // Verifica que el token esté presente
    if (!tokenData || !tokenData.access_token) {
      return res.status(500).json({ error: 'No se recibió un token de acceso válido' });
    }

    // Guardar el token en la sesión o base de datos
    req.session.accessToken = tokenData.access_token;  // Si usas sesiones en Express
    console.log('Token guardado en la sesión:', req.session.accessToken);

    // Obtener los datos del usuario usando el token
    const userData = await spotifyAuth.getUserData(tokenData.access_token);
    console.log('Datos del usuario:', userData);

    // Verificar que los datos del usuario fueron recibidos correctamente
    if (!userData) {
      return res.status(500).json({ error: 'No se pudieron obtener los datos del usuario' });
    }

    // Redirige a donde necesites después de la autenticación
    res.redirect('/dashboard'); // O la ruta que prefieras

  } catch (error) {
    console.error("Error en el flujo de autenticación de Spotify:", error);
    res.status(500).json({ error: 'Error al autenticar con Spotify' });
  }
});

module.exports = router;
