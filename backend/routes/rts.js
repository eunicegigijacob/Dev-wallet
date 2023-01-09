const express = require('express');
const { register,login, dashboard, doWithdrawal, transfer} = require('../controllers/customerControls.js');
const { verifyAuth } = require('../middleware/auth.js');
const routeManager = express.Router()
// routeManager.get('/',register)
routeManager.post('/registerCustomer',register)
routeManager.post('/Auth',login)
routeManager.post('/dashboard',verifyAuth,dashboard)
routeManager.put('/withdrawal',verifyAuth, doWithdrawal)
routeManager.post('/transfer', verifyAuth, transfer)


module.exports = {routeManager}



    