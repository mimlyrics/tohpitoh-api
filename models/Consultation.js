/*const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

module.exports = (sequelize) => {


    const Consultation = sequelize.define('Consultation', {
        id: {
            type: DataTypes.INTEGER,
            defaultValue: DataTypes.INTEGER,
            primaryKey: true
        },

        // Required: Link to patient and doctor
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
                model: 'doctors',
                key: 'id'
            }
        },

        // Basic consultation info
        consultation_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        // From PDF: "entrer les paramètres du patient au jour de la consultation"
        vital_signs: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Blood pressure, temperature, heart rate, etc.'
        },

        // From PDF: "notes cliniques, diagnostics, observations"
        chief_complaint: {
            type: DataTypes.TEXT,
            comment: "Patient's main reason for visit"
        },

        diagnosis: {
            type: DataTypes.TEXT,
            comment: "Doctor's diagnosis"
        },

        treatment_plan: {
            type: DataTypes.TEXT,
            comment: "Recommended treatment"
        },

        // Consultation type and status
        consultation_type: {
            type: DataTypes.ENUM('general', 'follow_up', 'emergency', 'specialist'),
            defaultValue: 'general'
        },

        status: {
            type: DataTypes.ENUM('completed', 'in_progress', 'scheduled', 'cancelled'),
            defaultValue: 'completed'
        },

        // Duration (optional)
        duration_minutes: {
            type: DataTypes.INTEGER,
            comment: 'Duration of consultation in minutes'
        },

        // Follow-up info
        follow_up_required: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        follow_up_date: {
            type: DataTypes.DATE,
            allowNull: true
        },

        // Attachments (for prescriptions, referrals, etc.)
        attachments: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Array of file URLs or paths'
        },

        // Metadata
        notes: {
            type: DataTypes.TEXT,
            comment: 'Additional notes'
        },

        is_confidential: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'consultations',
        timestamps: true,
        indexes: [{
                fields: ['patient_id', 'consultation_date']
            },
            {
                fields: ['doctor_id']
            }
        ]
    });

    return Consultation;
}
*/