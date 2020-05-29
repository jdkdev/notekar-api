import agent from 'doubleagent'
import server from '../src/Server/server'

// import { ajx } from '@frontierjs/frontend'
// const request = require('supertest')
// import { ajx } from '../ajx'
// let port = 3000
// let url = `http://localhost:${port}/api/v1/`
// server.listen(port)

describe('Login', () => {
  it('succeeds with correct credentials', async () => {
    let demoUser = {
      email: 'jordan+20@knight.works',
      password: 'test',
    }
    // This is an example of a fetch request
    // const res = await ajx.post(url + '/login', demoUser)
    // this is a call to the router
    let res = await agent(server).post('/api/v1/login', demoUser)
    expect(res.body.user.email).toBe(demoUser.email)
    expect(res.status).toBe(200)
  })
})
