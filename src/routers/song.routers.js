const { Router } = require("express");
const router = Router();
const songCtrl = require("../controller/song.controller");

router.get('/songs/tracks', songCtrl.getTracks);
router.get('/songs/track/:songId', songCtrl.getTrackUrl);
router.get('/songs/recomend/:setId', songCtrl.getRecommends);

module.exports = router; 