const passport = require('passport');
const router = require('express').Router();
const CLIENT_URL = "https://mimlyricstest2.onrender.com";

router.get('/auth/google', passport.authenticate('google', {scope: ["profile"]}));

router.get('/auth/login/failed', (req, res) => {
    console.log("failed");
    res.status(401).json({success: false, message: "failure"});
})

router.get("/auth/login/success", (req, res) => {
    console.log("success");
    if(req.user) {
        res.status(200).json({
            success: true,
            message: "successful",
            user: req.user,
            // cookies: req.cookies
        })
    }
});

router.get('auth/logout', (req, res) => {
    req.logout();
    res.redirect(CLIENT_URL);
});

router.get("auth/google/callback", passport.authenticate('google', {
    successRedirect: CLIENT_URL,
    failureRedirect: "auth/login/failed"
}));

module.exports = router;