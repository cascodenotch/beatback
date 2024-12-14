const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

router.get("/mis-sets", setCtrl.getSet);
router.delete("/mis-sets", setCtrl.deleteSet);
router.get("/set", setCtrl.getSet);
router.put("/set", setCtrl.putSet);
router.post("/set", setCtrl.postSet);
router.delete("/set/song", setCtrl.deleteSong);
router.get("/set/analisis", setCtrl.songAnalysis);

module.exports = router; 