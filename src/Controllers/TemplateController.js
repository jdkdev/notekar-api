const { env } = require('@frontierjs/backend')

const jwt = require('jsonwebtoken')

let ACCESS_TOKEN_SECRET = env.get('ACCESS_TOKEN_SECRET')
let REFRESH_TOKEN_SECRET = env.get('REFRESH_TOKEN_SECRET')
import User from '$m/User'

//fix
let refreshTokens = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGVtYWlsLmNvbSIsInBhc3N3b3JkIjoiJDJiJDEwJEJJQVVLRmJCakk2dGxHQVFxVTNHNnViQUNLS2tTZWkyUGNxRlZESE1acmU2VEJtekUwOGpTIiwiaWF0IjoxNTcyNzIzMzM2fQ.H94OYXkcQKEsaYP4m549g47ch5VfJA_1v2RtU-_JsMs',
]
const UserController = {
  index(req, res) {
    let users = User._getAll()
    return res.json(users)
  },
  all(req, res) {
    let users = User.getAll({ withDeleted: true })[0]._._getAll({
      withDeleted: true,
    })
    return res.json(users)
  },
  async store(req, res) {
    let user = ({ email, password } = req.body)
    res.status(201).send(await User.validateThenStore(user))
  },
  destroy(req, res) {
    User.delete(parseInt(req.params.id))

    return res.json({ ok: true })
  },
  restore({ params: { id } }, res) {
    let user = User.restore(parseInt(id))
    console.log({ user })
    res.json(user)
  },
  logout(req, res) {
    //reqork this into DB
    refreshTokens = refreshTokens.filter((token) => token !== req.body.token)
    res.sendStatus(204)
  },
  // Middleware Testing
  authenticateTokenMiddleware(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus(403)
      req.user = user
      next()
    })
  },
}
export default UserController
