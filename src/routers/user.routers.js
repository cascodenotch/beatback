const { Router } = require("express");
const router = Router();
const userCtrl = require("../controller/user.controller");

router.get('/spotify/login', userCtrl.spotifyLogin);  // Ruta para iniciar la vinculación
router.get('/spotify/callback', userCtrl.spotifyCallback);  // Ruta de callback
router.put('/user', userCtrl.putUser);


module.exports = router; 