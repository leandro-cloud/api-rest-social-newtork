import express, { json, urlencoded } from 'express'
import cors from 'cors'
import { connection } from './database/connection.js'
import { publicationRouter } from './routes/publication.js'
import { followRouter } from './routes/follow.js'
import { userRouter } from './routes/user.js'

const app = express()
const puerto = process.env.PORT || 3000

app.use(json())
app.use(urlencoded({ extended: true }))
app.use(cors())
app.use('/api/user', userRouter)
app.use('/api/follow', followRouter)
app.use('/api/publications', publicationRouter)

connection()

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'ruta /'
  })
})

app.listen(puerto, () => {
  console.log(`Server listening on http://localhost:${puerto}`)
})
