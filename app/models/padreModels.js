const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {

  const Padre = sequelize.define('Padre', {

    DNI: {
      type: DataTypes.CHAR(13),
      primaryKey: true,
      allowNull: false,
    },

    Nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    Apellido: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    Telefono: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },

    Correo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    Direccion: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    Ocupacion: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    TipoResponsable: {
      type: DataTypes.ENUM('Padre', 'Madre', 'Encargado'),
      allowNull: true,
    },

  }, {
    tableName: 'padre',
    timestamps: false,
  });

  return Padre;
};