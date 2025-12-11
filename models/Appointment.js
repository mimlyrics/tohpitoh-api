const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {
    const Appointment =  sequelize.define('Appointment', {
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
        doctor_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        appointment_date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        Appointment_type: {
            type: DataTypes.ENUM('consultation', 'follow_up', 'emergency', 'routine_check', 'vaccination', 'other'),
            defaultValue: 'consultation'
        },
        status: {
            type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')
        },
        reason: {
            type: DataTypes.TEXT
        },
        notes: {
            type: DataTypes.TEXT
        },
        duration_minutes: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        reminder_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        follow_up_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        follow_up_date: {
            type: DataTypes.DATE
        }
    }, 
    
    {
    tableName: 'appointments',
    timestamps: true
    }
    ) 

    return Appointment;
}