let express = require('express')
let router = express.Router()

const bodyParser = require('body-parser')
router.use(bodyParser.urlencoded({ extended: false }))
router.use(bodyParser.json())

router.use('/', (req, res, next) => {
  // console.log({body: req.body})
  next()
})

import TemplateController from '$c/TemplateController'
import AuthController from '$c/AuthController'

router.get(
  '/',
  // AuthController.authenticateTokenMiddleware,
  TemplateController.index
)
export default router
