const db = require("../app/config/db");
const app = require("../app/app");

let initialized = false;

module.exports = async (req, res) => {
    if (!initialized) {
        await db.sequelizeInstance.sync();
        initialized = true;
    }

    return app(req, res);
};