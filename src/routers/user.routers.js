const { Router } = require("express");
const router = Router();
const userCtrl = require("../controller/user.controller");

router.get('/spotify/login', userCtrl.spotifyLogin);  // Ruta para iniciar la vinculación
router.get('/spotify/callback', userCtrl.spotifyCallback);  // Ruta de callback

router.get("/user", userCtrl.getUser);


module.exports = router; 