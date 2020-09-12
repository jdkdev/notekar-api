import FileController from '$c/FileController'
import AuthController from '$c/AuthController'

const express = require('express')
const router = express.Router()

const bodyParser = require('body-parser')
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())

router.use('/', (req, res, next) => {
  // console.log({ body: req.user })
  next()
})

router.get(
  '/',
  // AuthController.authenticateTokenMiddleware,
  FileController.allProcessed
)
router.get(
  '/published/:published/:format*?',
  // AuthController.authenticateTokenMiddleware,
  FileController.articles
)
router.get(
  '/brain',
  // AuthController.authenticateTokenMiddleware,
  FileController.brain
)
router.get(
  '/brain2',
  // AuthController.authenticateTokenMiddleware,
  FileController.brain2
)
router.post(
  '/',
  // AuthController.authenticateTokenMiddleware,
  FileController.store
)
router.get(
  '/node',
  // AuthController.authenticateTokenMiddleware,
  FileController.randomNode
)
router.get(
  '/articles/:published',
  // AuthController.authenticateTokenMiddleware,
  FileController.articles
)
router.delete(
  '/:filepath',
  // AuthController.authenticateTokenMiddleware,
  FileController.destroy
)
router.get(
  '/raw',
  // AuthController.authenticateTokenMiddleware,
  FileController.raw
)
router.get(
  '/all',
  // AuthController.authenticateTokenMiddleware,
  FileController.all
)

router.get(
  '/:id',
  AuthController.authenticateTokenMiddleware,
  FileController.get
)
router.patch(
  '/',
  // AuthController.authenticateTokenMiddleware,
  FileController.update
)

export default router
