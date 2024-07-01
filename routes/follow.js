import { Router } from 'express'
import { followers, following, saveFollow, testFollow, unfollow } from '../controllers/follow.js'
import { ensureAuth } from '../middlewares/auth.js'

export const followRouter = Router()

followRouter.get('/test-follow', testFollow)
followRouter.post('/follow', ensureAuth, saveFollow)
followRouter.delete('/unfollow/:id', ensureAuth, unfollow)
followRouter.get('/following/:id?/:page?', ensureAuth, following)
followRouter.get('/followers/:id?/:page?', ensureAuth, followers)
