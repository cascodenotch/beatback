const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

// router.get("/sets", setCtrl.getSet);
// router.delete("/set", setCtrl.deleteSet);
// router.get("/set, setCtrl.getSet);
// router.put("/set", setCtrl.putSet);
router.post("/set", setCtrl.addSet);
// router.delete("/set/song", setCtrl.deleteSong);
// router.get("/set/analisis", setCtrl.songAnalysis);

module.exports = router; 