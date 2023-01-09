const sequelize = require("../config/connections.js")
const { Customer } = require("../models/customer.js")
const { deposit } = require("../models/savings.js")
const { withdrawal } = require("../models/withdrawal.js")
const { statement } = require("../models/accountStatment.js")
const jwt = require("jsonwebtoken")
const bcrypt = require('bcryptjs')
const { UUID } = require("sequelize")
const { response } = require("express")



const saltRounds = bcrypt.genSaltSync(10);
const secret = "secret"


const transaction = {
    text: null,
    type: null,
    amount: null,
    date: null
}

let allTransactions = []

const register = async (req, res) => {
    const cus = {
        cusName: req.body.CustomerName,
        username: req.body.username,
        password: bcrypt.hashSync(req.body.password, saltRounds)
    }

    Customer.findAll({
        where: {
            username: req.body.username
        }
    }).then(rs => {
        if (rs.length >= 1) {
            res.status(200).json([{ message: "username taken" }])
        }
        else {
            console.log(cus)
            Customer.create(cus).then(rs => {
                console.log(rs)
                res.status(200).json([{ message: "data created" }])
            }).catch(err => {
                console.log(err)
                res.status(403).json([{ message: "err" }])
            })
        }
    }).catch(err => {
        console.log(err)
    });


}

const login = async (req, res) => {
    const username = req.body.username
    const password = req.body.password
    Customer.findOne({
        where: {
            username: username
        }
    }).then(rs => {
        if (rs) {
            const validity = bcrypt.compareSync(password, rs.dataValues.password)
            if (validity == true) {
                const token = jwt.sign(rs.dataValues, secret)
                res.status(200).json([{ message: token }])

                statement.findOne({
                    where: {
                        custid: rs.dataValues.custid
                    }
                }).then(result => {
                    if (!result) {
                        console.log('...........' + result)
                        statementfn(rs.dataValues.custid).
                            then(rz => {
                                console.log('....rz....' + rz.custid)
                            })
                    }
                })
            } else {
                res.status(200).json([{ message: "invalid token" }])
            }
        } else {
            res.status(200).json([{ message: "invalid user" }])
        }

    }).catch(err => {
        console.log(err)
    });
}


const dashboard = async (req, res) => {
    const customerID = req.decoded.custid
    let balances = 0.00
    let withdrawbal = 0.00
    let savingsbal = 0.00


    allTransactions = []
    // get and send withdrawal transaction history 
    withdrawal.findAll({
        where: {
            custid: customerID
        },
        order: [["createdAt", "DESC"]]
    }).then(results => {
        if (typeof results === undefined) {
            console.log(results + 'is null')
        } else {
            results.map(result => {

                let wTransaction = Object.create(transaction)
                wTransaction.text = 'Debit transaction'
                wTransaction.type = 'withdrawal'
                wTransaction.amount = result.Amountwithdraw
                wTransaction.date = result.createdAt
                allTransactions.push(wTransaction)
            })
        }
    }).catch(error => {
        console.log(error)
    })

    await deposit.findAll({
        where: {
            custid: customerID
        },
        order: [["createdAt", "DESC"]]
    }).then(results => {
        if (results === null) {
            console.log(results)
        } else {
            results.map(result => {
                let dTransaction = Object.create(transaction)
                dTransaction.text = 'credit transaction'
                dTransaction.type = 'Deposit'
                dTransaction.amount = result.Amountdep
                dTransaction.date = result.createdAt
                allTransactions.push(dTransaction)
            })
        }
    }).catch(error => {
        console.log(error)
    })





    statement.findOne({
        where: {
            custid: customerID
        }
    })
        .then(results => {
            console.log('this is results ' + results)
            if (results) {
                balances = results.totalbal
                withdrawbal = results.statementwithdraw
                savingsbal = results.statementdeposit
                res.status(200).json([{ customer: customerID, fullname: req.decoded.cusName, savings: savingsbal, withdraw: withdrawbal, balance: balances, transactions: allTransactions }])

            }
        }).catch(err => {
            console.log(err)
        })


}


const doWithdrawal = async (req, res) => {
    const customerID = req.decoded.custid
    const passWord = req.decoded.password
    console.log('.......here is the password' + passWord)
    const amount = req.body.Amount
    const pin = req.body.Pin

    // find the account statement of the user 
    statement.findOne({
        where: {
            custid: customerID
        }
    }).then(result => {
        if (result === null) {
            res.status(200).json([{ message: 'pls do a deposit first!' }])

        } else if (amount > result.dataValues.totalbal) {
            console.log('insufficient funds')
            res.status(200).json([{ message: 'insufficient funds' }])
        } else {
            const validity = bcrypt.compareSync(pin, req.decoded.password)
            if (validity === true) {
                withdraw(customerID, amount)
                    .then(rs => {
                        statement.update({
                            statementwithdraw: (result.statementwithdraw + amount),
                            totalbal: (result.totalbal - amount)
                        },
                            {
                                where: {
                                    custid: customerID
                                }
                            }).then(rs => {
                                res.status(200).json([{ message: 'done withdrawal & updated statement' }])
                                console.log(rs)
                            })

                    })
            } else {
                res.status(200).json([{ message: 'Incorrect pin' }])
            }
        }

    })
        .catch(err => {
            console.log(err)
        })


}



const statementfn = async (customerid) => {
    const newStatement = {
        statementwithdraw: 0.00,
        statementdeposit: 0.00,
        totalbal: 0.00,
        custid: customerid

    }

    statement.create(newStatement)
        .then(result => {
            console.log('statement done!')
        }).catch(err => {
            console.log(err)
        })
    return newStatement
}


// function to insert a new row of data into withdrawal table representing the withdrawal request
const withdraw = async (customerid, amount) => {
    // create an object to represent table row

    const newWithdraw = {
        Amountwithdraw: parseInt(amount),
        custid: customerid
    }
    // use sequelize to create a new row of data into withdrawal table
    withdrawal.create(newWithdraw)
        .then(result => {
            console.log('withdrawl done!')

        })
        .catch(err => {
            console.log(err)
        })
    return newWithdraw
}


const transfer = async (req, res) => {
    const customerID = req.decoded.custid
    const transferpin = req.decoded.password
    const beneficiaryName = req.body.beneficiaryname
    const amountToTransfer = req.body.Amount
    const pin = req.body.Pin
    let beneficiaryId

    console.log('transferamount =' + amountToTransfer)

    Customer.findOne({
        where: {
            username: beneficiaryName
        }
    }).then(result => {
        if (result === null) {
            res.status(200).json([{ message: 'Account does not exist' }])
        } else {
            beneficiaryId = result.custid
            console.log('this is the beneficiary id = ' + beneficiaryId)
            statement.findOne({
                where: {
                    custid: customerID
                }
            }).then(rs => {
                if (rs !== null) {
                    if (amountToTransfer > rs.totalbal) {
                        res.status(200).json([{ message: 'insufficient funds' }])
                    } else {
                        const validity = bcrypt.compareSync(pin, req.decoded.password)
                        if (validity === true) {
                            withdraw(customerID, amountToTransfer)
                                .then(async rz => {
                                    console.log('this is withdraw returning value ' + rz.Amountwithdraw)
                                    statement.findOne({
                                        where: {
                                            custid: customerID
                                        }
                                    })
                                        .then(rs => {
                                            if (rs) {
                                                statement.update({
                                                    statementwithdraw: rs.statementwithdraw + rz.Amountwithdraw,
                                                    totalbal: rs.totalbal - rz.Amountwithdraw
                                                }, {
                                                    where: {
                                                        custid: rz.custid
                                                    }
                                                })
                                                deposit.create({
                                                    Amountdep: rz.Amountwithdraw,
                                                    custid: beneficiaryId
                                                })
                                                    .then(rs => {
                                                        console.log('deposit created ' + rs.Amountdep)
                                                        statement.findOne({
                                                            where: {
                                                                custid: beneficiaryId
                                                            }
                                                        })
                                                            .then(rr => {
                                                                if (rr) {
                                                                    statement.update({
                                                                        statementdeposit: rs.Amountdep,
                                                                        totalbal: rr.totalbal + rs.Amountdep
                                                                    },
                                                                        {
                                                                            where: {
                                                                                custid: beneficiaryId
                                                                            }
                                                                        }
                                                                    )
                                                                        .then(r => {
                                                                            console.log(' this is receiver statement' + r)
                                                                            res.status(200).json([{ message: 'Transfer successful' }])
                                                                        })
                                                                } else {
                                                                    statementfn(beneficiaryId).then(result => {
                                                                        statement.update({
                                                                            statementdeposit: rs.Amountdep,
                                                                            totalbal: result.totalbal + rs.Amountdep
                                                                        },
                                                                            {
                                                                                where: {
                                                                                    custid: beneficiaryId
                                                                                }
                                                                            }
                                                                        ).then(result => {
                                                                            console.log('....' + result)
                                                                            res.status(200).json([{ message: 'Transfer successful' }])
                                                                        })
                                                                    })
                                                                }

                                                            })
                                                    })

                                            }
                                        })







                                })
                        } else {
                            res.status(200).json([{ message: 'Incorrect Password' }])
                        }


                    }
                }
            })
                .catch(err => {
                    console.log(err)
                })
        }
    })




}


module.exports = { register, login, dashboard, doWithdrawal, transfer }