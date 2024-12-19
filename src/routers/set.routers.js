const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

// router.get("/sets", setCtrl.getSet);
// router.delete("/set", setCtrl.deleteSet);
router.get("/set", setCtrl.getSet);
router.get("/set/songs", setCtrl.getSetSongs);
router.put("/set/title", setCtrl.changeTitle);
router.post("/set", setCtrl.addSet);
router.delete("/set/song", setCtrl.deleteSong);
router.post("/set/song", setCtrl.addSongToSet);
// router.delete("/set/song", setCtrl.deleteSong);
// router.get("/set/analisis", setCtrl.songAnalysis);

module.exports = router; 