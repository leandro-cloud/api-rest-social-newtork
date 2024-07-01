import { Router } from 'express'
import { deletePublication, feed, publicationsUser, savePublication, showMedia, showPublication, testPublication, uploadMedia } from '../controllers/publication.js'
import { ensureAuth } from '../middlewares/auth.js'
import multer from 'multer'
import { checkEntityExists } from '../middlewares/checkEntityExiststs.js'
import { Publication } from '../models/publication.js'

export const publicationRouter = Router()

// Configuración de subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/publications/')
  },
  filename: (req, file, cb) => {
    cb(null, 'pub-' + Date.now() + '-' + file.originalname)
  }
})

const uploads = multer({ storage })

publicationRouter.get('/test-publication', testPublication)
publicationRouter.post('/new-publication', ensureAuth, savePublication)
publicationRouter.get('/show-publication/:id', showPublication)
publicationRouter.delete('/delete-publication/:id', ensureAuth, deletePublication)
publicationRouter.get('/publications-user/:id/:page?', ensureAuth, publicationsUser)
publicationRouter.post('/upload-media/:id', [ensureAuth, checkEntityExists(Publication, 'id'), uploads.single('file0')], uploadMedia)
publicationRouter.get('/media/:file', showMedia)
publicationRouter.get('/feed/:page?', ensureAuth, feed)
