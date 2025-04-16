const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');

router.post('/login', auth.authLogin);
router.use(authenticate)
router.get('/profile', auth.getProfile);

module.exports = router;