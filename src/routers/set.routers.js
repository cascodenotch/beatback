const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

router.get("/set", setCtrl.getSet);
router.get("/set/songs", setCtrl.getSetSongs);
router.put("/set/title", setCtrl.changeTitle);
router.post("/set", setCtrl.addSet);
router.delete("/set/song", setCtrl.deleteSong);
router.post("/set/song", setCtrl.addSongToSet);
router.get("/set/:id_user", setCtrl.getSetsByUser);
router.delete('/set/:id_set', setCtrl.deleteSet); 
// router.get("/set/analisis", setCtrl.songAnalysis);

module.exports = router; 