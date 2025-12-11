const {DataTypes, DATE} =require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {
    const Prescription = sequelize.define('Prescription', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        patient_id: {
            type: DataTypes.INTEGER,
            allowNUll: false,
            references: {
                model: 'patients',
                key: 'id'
            }
        },
        doctor_id: {
            type: DataTypes.INTEGER,
            allowNUll: false,
            references: {
                model: 'patients',
                key: 'id'
            }
        },
        medication_name: {
            type: DataTypes.STRING(200),
            allowNUll: false
        },
        dosage: {
            type: DataTypes.STRING(100),
        },
        frequency: {
            type: DataTypes.STRING(100)
        },
        duration: {
            type: DataTypes.STRING(50)
        },
        prescribed_date: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        end_date: {
            type: DataTypes.DATEONLY
        },
        instructions: {
            type: DataTypes.TEXT
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }


    }, {
        tableName: 'prescriptions',
        timestamps: true,
        paranoid: true
    }
)

    return Prescription;
}