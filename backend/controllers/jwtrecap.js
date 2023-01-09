const jwt = require('jsonwebtoken')
const key = "tech4dev"
var user = {userid : 1,username:"Jimmy"}
console.log(user)
var encoded = jwt.sign(user,key)
console.log(encoded)




const decodedvalue = jwt.verify(encoded,"tech4dev")

console.log(decodedvalue.iat)
const date = new Date(decodedvalue.iat * 1000)
console.log(date)
// months = ['jan','feb','match','april','may','june','july','august','sept','oct','nov','dec']
//  const today =  new Date("2022-08-06")
//  console.log(months[today.getMonth()])



