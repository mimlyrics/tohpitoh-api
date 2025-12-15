const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const MedicalRecord = sequelize.define('MedicalRecord', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        patient_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'patients',
                key: 'id'
            }
        },
        record_type: {
            type: DataTypes.ENUM('vaccination', 'prescription', 'diagonosis', 'consultation', 'other'),
            allowNull: false
        },

        title: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        doctor_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'users',
                key: 'id'
            }
        },

        laboratory_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'laboratories',
                key: 'id'
            }
        },

        attachment_url: {
            type: DataTypes.STRING,
            allowNull: true
        },

        is_shared: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        shared_until: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
     {
        tableName: 'medical_records',
        timestamps: true,
        paranoid: true
    }
)
    return MedicalRecord;
}

