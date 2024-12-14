const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

router.get("/set", setCtrl.getSet);
router.put("/set", setCtrl.putSet);
router.post("/set", setCtrl.postSet);
router.delete("/set", setCtrl.deleteSet);

module.exports = router; 