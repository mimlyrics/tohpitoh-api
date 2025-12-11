const router = require("express").Router();

const {handleRefreshToken} = require("../controllers/refreshTokenController");

router.get('/jwt/refresh', handleRefreshToken);

module.exports = router;