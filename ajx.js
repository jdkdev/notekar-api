/**
 * Frontier App Management
 *
 * */

//TODO: Try moving this to require and try/catch stmt
//try {
//const env = require('../../../.env.js');
//} catch (err) {
//// send error to log file
//}
import fetch from 'node-fetch'
let authorization

let fetchData = async function (url, options) {
  let fetchUrl = url

  let defaultOpts = {
    // method: 'POST', // *GET, POST, PUT, DELETE, etc.
    // params: method === 'GET' ? JSON.stringify(data) : '{}', // body data type must match "Content-Type" header
    // body: method === 'GET' ? '{}' : JSON.stringify(data) // body data type must match "Content-Type" header
    credentials: 'omit', // include, *same-origin, omit
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
  }
  if (authorization) {
    defaultOpts.headers.authorization = 'Bearer ' + authorization
  }

  options = options ? { ...options, ...defaultOpts } : defaultOpts
  // console.log({options})

  console.log('fetchData')
  let res = await fetch(fetchUrl, options)
  console.log('fetched')

  if ([401, 403, 500].includes(res.status)) {
    logout()
    return false
  } else return await res.json()
}

/**
 * API interface (CRUD & custom requests)
 * CRUD (GET, POST)
 * STD ajx (SAVE, DESTROY, RESTORE)
 * Custom (ajax)
 * */

export const ajax = async function (url = '', data, opts) {
  if (data) {
    //console.log({data})
    opts['body'] = JSON.stringify(data)
  }
  // not sure if I will need to do this
  // params: method === 'GET' ? JSON.stringify(data) : '{}'

  console.log('ajax')
  let res = await fetchData(url, opts)
  //console.log({res})

  if ([401, 403, 500].includes(res.status)) return logout('/')
  else return res
}

const get = function (url) {
  return ajax(url)
}

const post = function (url, data) {
  console.log('post')
  if (!data) return alert('Save Function must submit data')

  return ajax(url, data, {
    method: 'POST',
  })
}

/**
 * Alias for post function
 */
const save = function (url, data) {
  return post(url, data)
}

const destroy = function (url) {
  return ajax(url, null, {
    method: 'DELETE',
  })
}

const patch = function (url, data) {
  return ajax(url, data, {
    method: 'PATCH',
  })
}

const restore = function (url) {
  return ajax(url + '/restore', null, {
    method: 'PATCH',
  })
}

export const ajx = {
  destroy,
  restore,
  save,
  patch,
  post,
  get,
}
