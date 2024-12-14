const { Router } = require("express");
const router = Router();
const userCtrl = require("../controller/user.controller");

router.get("/", userCtrl.getUser);

module.exports = router; 