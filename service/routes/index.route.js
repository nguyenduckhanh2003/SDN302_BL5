const authRoute = require('./auth.route');
const productRoute = require('./products.route');
const initRoutes = (app) => {
    app.get('/', (req, res) => {
        res.send('Welcome to API Manager Employee!');
    });

    app.use('/auth', authRoute);
    app.use('/api', productRoute);
}

module.exports = initRoutes;
