const { env } = require('@frontierjs/backend')
const jwt = require('jsonwebtoken')

let ACCESS_TOKEN_SECRET = env.get('ACCESS_TOKEN_SECRET')
let REFRESH_TOKEN_SECRET = env.get('REFRESH_TOKEN_SECRET')
import User from '$m/User'

//fix
let refreshTokens = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGVtYWlsLmNvbSIsInBhc3N3b3JkIjoiJDJiJDEwJEJJQVVLRmJCakk2dGxHQVFxVTNHNnViQUNLS2tTZWkyUGNxRlZESE1acmU2VEJtekUwOGpTIiwiaWF0IjoxNTcyNzIzMzM2fQ.H94OYXkcQKEsaYP4m549g47ch5VfJA_1v2RtU-_JsMs'
]
const AuthController = {
  async register(req, res) {
    // console.log({req})
    //validate request
    try {
      let user = ({ email, password } = req.body)
      res.status(201).send(await User.validateThenStore(user))
    } catch (e) {
      console.log('error', e)
      res.status(500).send()
    }
  },
  async login({ body: { email, password } }, res) {
    let user = User.findByEmail(email)
    if (!user) return res.sendStatus(401)

    try {
      if (await user.auth(password)) {
        let { accessToken, refreshToken } = await user.login()
        refreshTokens.push(refreshToken)
        res.json({ accessToken: accessToken, refreshToken: refreshToken, user })
      } else {
        return res.sendStatus(401)
      }
    } catch (e) {
      console.log(e)
      return res.status(401).json({ message: 'You are not registered!' })
    }
  },

  refresh(req, res) {
    const refreshToken = req.body.token
    if (refreshToken == null) return res.sendStatus(401)
    if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err, userData) => {
      if (err) return res.sendStatus(403)
      let user = User.find(userData.id)
      let { accessToken } = await user.login()
      res.json({ accessToken })
    })
  },

  async verify(req, res) {
    res.json({ message: 'Valid Token', user: req.user })
  },

  logout(req, res) {
    //reqork this into DB
    refreshTokens = refreshTokens.filter(token => token !== req.body.token)
    res.sendStatus(204)
  },
  // Middleware Testing
  authenticateTokenMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.status(401).send({ error: 'denied' })

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).send({ error: 'unauthorized' })
      req.user = user
      next()
    })
  }
}
export default AuthController
