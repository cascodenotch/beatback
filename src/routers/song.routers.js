const { Router } = require("express");
const router = Router();
const songCtrl = require("../controller/song.controller");

// router.get("/songs", songCtrl.getRecentlyPlayed);
// router.get("/recomendations", songCtrl.getRecommendations);
router.get("/songs", songCtrl.getSavedTracks);
router.get('/songs/search', songCtrl.searchTracks);
router.get('/songs/track/:songId', songCtrl.getTrackUrl);


module.exports = router; 