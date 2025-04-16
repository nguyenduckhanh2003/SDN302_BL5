const router = require('express').Router();
const product = require('../controllers/products.controller');


router.get('/products', product.getProducts);
router.get('/product/:id', product.getProductById);

module.exports = router;