const router = require("express").Router();
const Store = require("../controllers/Store.controller");

router.get("/", Store.getStore);
router.get("/:id", Store.getStoreById );

module.exports = router;
