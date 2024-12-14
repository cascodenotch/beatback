const { Router } = require("express");
const router = Router();
const setCtrl = require("../controller/set.controller");

router.get("/set", userCtrl.getSet);
router.put("/set", userCtrl.putSet);
router.post("/set", userCtrl.postSet);
router.delete("/set", userCtrl.deleteSet);

module.exports = router; 