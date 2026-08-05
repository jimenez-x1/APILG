'use strict';

const Sequelize = require('sequelize');
require('dotenv').config();

const sequelizeInstance = new Sequelize(
    process.env.DB,
    process.env.DB_USER,
    process.env.PASSWORD,
    {
        host: process.env.HOST,
        dialect: process.env.DIALECT,
        port: process.env.MY_SQL_PORT,
        dialectOptions: {
            connectTimeout: 10000,
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: parseInt(process.env.POOL_MAX),
            min: parseInt(process.env.POOL_MIN),
            acquire: parseInt(process.env.POOL_ACQUIRE),
            idle: parseInt(process.env.POOL_IDLE)
        }
    }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelizeInstance = sequelizeInstance;

// =======================
// MODELOS
// =======================

db.calificacion = require('../models/calificacionModels')(sequelizeInstance);
db.alumno = require('../models/alumnoModels')(sequelizeInstance);
db.clase = require('../models/claseModels')(sequelizeInstance);
db.grado = require('../models/gradoModels')(sequelizeInstance);
db.maestroGrado = require('../models/maestrogradoModels')(sequelizeInstance);
db.maestro = require('../models/maestroModels')(sequelizeInstance);
db.padre = require('../models/padreModels')(sequelizeInstance);
db.pagos = require('../models/pagosModels')(sequelizeInstance);
db.gradoClase = require('../models/gradoClaseModels')(sequelizeInstance);
db.user = require('../models/userModels')(sequelizeInstance);
db.archivo = require('../models/archivoModels')(sequelizeInstance, Sequelize);

/* =======================
   MAESTRO <-> GRADO
======================= */

db.maestro.belongsToMany(db.grado, {
    through: db.maestroGrado,
    foreignKey: 'DNI_Maestro',
    otherKey: 'ID_Grado'
});

db.grado.belongsToMany(db.maestro, {
    through: db.maestroGrado,
    foreignKey: 'ID_Grado',
    otherKey: 'DNI_Maestro'
});

/* =======================
   PADRE -> ALUMNO
======================= */

db.padre.hasMany(db.alumno, {
    foreignKey: 'DNI_Padre',
    sourceKey: 'DNI'
});

db.alumno.belongsTo(db.padre, {
    foreignKey: 'DNI_Padre',
    targetKey: 'DNI'
});

/* =======================
   GRADO -> ALUMNO
======================= */

db.grado.hasMany(db.alumno, {
    foreignKey: 'ID_Grado'
});

db.alumno.belongsTo(db.grado, {
    foreignKey: 'ID_Grado'
});

/* =======================
   ALUMNO -> PAGOS
======================= */

db.alumno.hasMany(db.pagos, {
    foreignKey: 'DNI_Alumno',
    sourceKey: 'DNI'
});

db.pagos.belongsTo(db.alumno, {
    foreignKey: 'DNI_Alumno',
    targetKey: 'DNI'
});

/* =======================
   PADRE -> PAGOS
======================= */

db.padre.hasMany(db.pagos, {
    foreignKey: 'DNI_Padre',
    sourceKey: 'DNI'
});

db.pagos.belongsTo(db.padre, {
    foreignKey: 'DNI_Padre',
    targetKey: 'DNI'
});

/* =======================
   GRADO <-> CLASE
======================= */

db.grado.belongsToMany(db.clase, {
    through: db.gradoClase,
    foreignKey: 'ID_Grado',
    otherKey: 'ID_Clase'
});

db.clase.belongsToMany(db.grado, {
    through: db.gradoClase,
    foreignKey: 'ID_Clase',
    otherKey: 'ID_Grado'
});

/* =======================
   GRADO_CLASE -> CLASE
======================= */

db.gradoClase.belongsTo(db.clase, {
    foreignKey: 'ID_Clase'
});

db.clase.hasMany(db.gradoClase, {
    foreignKey: 'ID_Clase'
});

/* =======================
   ALUMNO -> CALIFICACIÓN
======================= */

db.alumno.hasMany(db.calificacion, {
    foreignKey: 'DNI_Alumno',
    sourceKey: 'DNI'
});

db.calificacion.belongsTo(db.alumno, {
    foreignKey: 'DNI_Alumno',
    targetKey: 'DNI'
});

/* =======================
   CLASE -> CALIFICACIÓN
======================= */

db.clase.hasMany(db.calificacion, {
    foreignKey: 'ID_Clase'
});

db.calificacion.belongsTo(db.clase, {
    foreignKey: 'ID_Clase'
});

/* =======================
   RELACIONES CON USER
======================= */

db.maestro.belongsTo(db.user, {
    foreignKey: 'DNI',
    targetKey: 'userId'
});

db.padre.belongsTo(db.user, {
    foreignKey: 'userId',
    targetKey: 'userId'
});


module.exports = db;