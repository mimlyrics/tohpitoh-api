const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {
    const Laboratory = sequelize.define('Laboratory', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
            model: 'users',
            key: 'id'
            }
        },
        lab_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        license_number: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true
        },
        address: {
            type: DataTypes.TEXT,
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
        }
        }, {
        tableName: 'laboratories'
        }   
    )
    return Laboratory;
}