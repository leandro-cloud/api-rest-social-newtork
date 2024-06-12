const express = require('express')
const cors = require('cors')
const connection = require('./database/connection')

const app = express()
connection()

app.listen(3000, () => {
  console.log(`Server listening on`)
})