const { env } = require('@frontierjs/backend')
const helmet = require('helmet')
const cors = require('cors')

let server = require('express')()
import router from './router.js'

server.use(cors())
server.use(helmet())
server.use(helmet.hidePoweredBy({ setTo: 'PHP 3.3.0' }))
server.use('/api/v1', router)

export default server
