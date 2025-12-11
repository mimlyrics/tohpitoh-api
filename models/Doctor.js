const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Doctor = sequelize.define('Doctor', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },

        specialization: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        license_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true
        },

        hospital_affiliation: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        approved_by_admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },

        approved_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
    }, {
        tableName: 'doctors',
        timestamps: true
    })

    return Doctor;
}