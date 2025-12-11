const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {
    const LabTest = sequelize.define('LabTest', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey:true,
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
        doctor_id: {
            type: DataTypes.INTEGER,
            references: {
                model: 'doctors',
                key: 'id'
            }
        },
        laboratory_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'laboratories',
                key: 'id'
            }
        },
        test_name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
            defaultValue: 'pending'
        },
        results: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        result_file_url: {
            type: DataTypes.STRING,
            allowNull: true
        },
        doctor_interpretation: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ordered_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completed_date: {
            type: DataTypes.DATE,
            allowNull: true
        }


    }, {
        tableName: 'lab_tests',
        timestamps: true,
        paranoid: true
    }
)
    return  LabTest;
}