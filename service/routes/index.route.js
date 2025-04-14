
const initRoutes = (app) => {
    app.get('/', (req, res) => {
        res.send('Welcome to API Manager Employee!');
    });

}

module.exports = initRoutes;
