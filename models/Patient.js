const sequelize = require('../config/db');
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {

    const Patient = sequelize.define('Patient', {
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

            gender: {
                type: DataTypes.ENUM('male', 'female', 'other'),
                allowNull: true
            },
            date_of_birth: {
                type: DataTypes.DATEONLY,
                allowNull: true
            },
            blood_type: {
                type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'),
                defaultValue: 'unknown'
            },
            genotype: {
                type: DataTypes.ENUM('AA', 'AS', 'AC', 'SS', 'SC', 'CC', 'unknown'),
                defaultValue: 'unknown'
            },
            known_allergies: {
                type: DataTypes.TEXT,
                comment: 'Comma-separated list of allergies'
            },
            known_diseases: {
                type: DataTypes.TEXT,
                comment: 'Comma-separated list of chronic diseases'
            },
            height: {
                type: DataTypes.FLOAT,
                allowNull: true,
                comment: 'Height in centimeters'
            },
            weight: {
                type: DataTypes.FLOAT,
                allowNull: true,
                comment: 'Weight in kilograms' 
            },
            emergency_access_enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            emergency_access_code: {
                type: DataTypes.STRING(6),
                allowNull: true
            }
        },

        {
            tableName: 'patients',
            timestamps: true
        }

    )
    return Patient;
}