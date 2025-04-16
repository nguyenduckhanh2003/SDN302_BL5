const authRoute = require('./auth.route');
const initRoutes = (app) => {
    app.get('/', (req, res) => {
        res.send('Welcome to API Manager Employee!');
    });

    app.use('/auth', authRoute);
}

module.exports = initRoutes;
