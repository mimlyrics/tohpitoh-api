const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const EMAIL_REGEX = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const PASSWORD_REGEX = /^[A-Za-z]\w{7,14}$/;
const NAME_REGEX = /^[a-zA-Z0-9]+$/;
const PHONE_REGEX = /^\d{9,13}$/;

module.exports = (sequelize) => {
    const User = sequelize.define(
        "User", {

            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            
            first_name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "firstName is required" },
                    is: {
                        args: NAME_REGEX,
                        msg: "Invalid firstName format",
                    },
                },
            },

            last_name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "lastName is required" },
                    is: {
                        args: NAME_REGEX,
                        msg: "Invalid lastName format",
                    },
                },
            },

            email: {
                type: DataTypes.STRING,
                unique: true,
                allowNull: false,
                validate: {
                    isEmail: true,
                    is: {
                        args: EMAIL_REGEX,
                        msg: "Invalid email format",
                    },
                },
            },

            phone: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    is: {
                        args: PHONE_REGEX,
                        msg: "Phone must contain 9–13 digits",
                    },
                },
            },

            country: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            password: {
                type: DataTypes.STRING,
                allowNull: false,
                /*validate: {
                  is: {
                    args: PASSWORD_REGEX,
                    msg: "Password must be 8–15 chars starting with a letter",
                  },
                },*/
            },

            avatar: {
                type: DataTypes.STRING,
                defaultValue: "",
            },

            role: {
                type: DataTypes.STRING,
                defaultValue: "user"
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            is_verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },

            refreshToken: {
                type: DataTypes.ARRAY(DataTypes.STRING),
                defaultValue: [],
            },
        }, {
            tableName: "users",
            freezeTableName: true,
            timestamps: true,

            hooks: {
                async beforeSave(user) {
                    if (user.changed("password")) {
                        const salt = await bcrypt.genSalt(10);
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                },
            },
        }
    );

    // Instance methods
    User.prototype.matchPassword = async function(enteredPassword) {
        return bcrypt.compare(enteredPassword, this.password);
    };

    User.prototype.generateEmailToken = function() {
        return jwt.sign({ email: this.email },
            process.env.EMAIL_TOKEN_SECRET, { expiresIn: "1d" }
        );
    };

    User.prototype.generateEmailCode = function() {
        const min = 100000;
        const max = 999999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    User.associate = (models) => {
        User.hasMany(models.ReportUser, { foreignKey: 'reporterId', as: 'reportsMade' });
        User.hasMany(models.ReportUser, { foreignKey: 'reportedUserId', as: 'reportsReceived' });
        User.hasMany(models.Provider, { foreignKey: 'userId', as: 'providers' });
    };


    return User;


};