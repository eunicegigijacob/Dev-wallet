const Sequelize = require('sequelize')
const dotenv = require('dotenv') 
dotenv.config()
const sequelize = new Sequelize(process.env.DATABASE,process.env.DATABASE_USER,"EuNiCe",{
    dialect:"mysql", host:"localhost"
});

module.exports = sequelize;