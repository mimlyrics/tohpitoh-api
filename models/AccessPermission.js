const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {
    const AccessPermission = sequelize.define('AccessPermission', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        patient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
            model: 'patients',
            key: 'id'
            }
        },
        granted_to_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
            model: 'users',
            key: 'id'
            }
        },
        granted_by_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
            model: 'users',
            key: 'id'
            }
        },
        access_type: {
            type: DataTypes.ENUM('view', 'edit'),
            defaultValue: 'view'
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        purpose: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
        }, {
        tableName: 'access_permissions'
        }
    )

    return AccessPermission;
}
