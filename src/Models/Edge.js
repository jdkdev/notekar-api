const { env } = require('@frontierjs/backend')
const { Model } = require('@frontierjs/backend')

class Edge extends Model {
  constructor({ id = null, self = '', source, target, relation }) {
    super()
    this.id = id
    this.self = self
    this.source = source
    this.target = target
    this.relation = relation
    return this
  }
  static get useSoftDeletes() {
    return false
  }
  static get hidden() {
    return []
  }
  static get guarded() {
    return []
  }
  static get fields() {
    return [
      {
        name: 'id',
        type: 'integer',
        opts: 'NOT NULL PRIMARY KEY AUTOINCREMENT',
      },
      { name: 'self', type: 'text' },
      { name: 'source', type: 'integer' },
      { name: 'target', type: 'integer' },
      { name: 'relation', type: 'integer' }, // -1 = f , 0 = a, 1 = d
    ]
  }
  async auth(pw) {
    let sql = 'SELECT email FROM example where id = $id'
    let { result } = this._.raw(sql, { id: this.id }) || {}
  }
  login() {
    refreshTokens.push(refreshToken)
    return { accessToken, refreshToken }
  }
}

export default Edge
