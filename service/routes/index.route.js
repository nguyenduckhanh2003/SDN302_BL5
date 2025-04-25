const authRoute = require('./auth.route');
const productRoute = require('./products.route');
const chatRoute = require('./chat.route');
const orderRoutes = require('./ordermanagersell.routes');
const initRoutes = (app) => {
    app.get('/', (req, res) => {
        res.send('Welcome to API Manager Employee!');
    });

    app.use('/auth', authRoute);
    app.use('/api', productRoute);
    app.use('/api/chat', chatRoute);
    app.use('/api/orders', orderRoutes);
}

module.exports = initRoutes;
