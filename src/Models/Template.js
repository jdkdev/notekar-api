const { env } = require('@frontierjs/backend')
const { Model } = require('@frontierjs/backend')

class Example extends Model {
    constructor({id = null, email = ''}) {
        super()
        this.id = id
        this.email = email
        return this
    }
    static get useSoftDeletes() {
        return false;
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
              opts: 'NOT NULL PRIMARY KEY AUTOINCREMENT'
            },
            { name: 'email', type: 'text' }
        ]
    }
    async auth(pw) {
        let sql = 'SELECT email FROM example where id = $id'
        let { result } = (this._.raw(sql, {id: this.id}) || {})
    }
    login() {
        refreshTokens.push(refreshToken)
        return {accessToken, refreshToken}
    }
}

export default = Example
