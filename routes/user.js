import { Router } from 'express'
import { avatar, counters, listUsers, login, profile, register, testUser, updateUser, uploadFiles } from '../controllers/user.js'
import { ensureAuth } from '../middlewares/auth.js'
import multer from 'multer'
import { checkEntityExists } from '../middlewares/checkEntityExiststs.js'
import { User } from '../models/user.js'
export const userRouter = Router()

// Configuración de subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/avatar/')
  },
  filename: (req, file, cb) => {
    cb(null, 'avatar-' + Date.now() + '-' + file.originalname)
  }
})

// Middleware para subida de archivos
const uploads = multer({ storage })

userRouter.get('/test-user', ensureAuth, testUser)
userRouter.post('/register', register)
userRouter.post('/login', login)
userRouter.get('/profile/:id', ensureAuth, profile)
userRouter.get('/list/:page?', ensureAuth, listUsers)
userRouter.put('/update', ensureAuth, updateUser)
userRouter.post('/upload', [ensureAuth, checkEntityExists(User, 'user_id'), uploads.single('file0')], uploadFiles)
userRouter.get('/avatar/:file', avatar)
userRouter.get('/counter/:id?', ensureAuth, counters)
