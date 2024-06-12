const express = require('express')
const cors = require('cors')
const connection = require('./database/connection')

const app = express()
const puerto = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())

connection()

app.get('/', (req, res) => {
  res.status(200).json({
    "id": 1,
    "name": "Leandro Peralta",
    "username": "Leandro90"
  }) 
})

app.listen(puerto, () => {
  console.log(`Server listening on http://localhost:${puerto}`)
})
