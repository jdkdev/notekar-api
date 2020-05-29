const Faker = require('faker')
const { env } = require('@frontierjs/backend')
const { Model } = require('@frontierjs/backend')
const NOTES_PATH = env.get('NOTES_PATH')
const { unlink, readFileSync, statSync, writeFileSync } = require('fs')
const { readdir } = require('fs').promises
const { resolve } = require('path')
import Edge from '$m/Edge'
const MD = require('markdown-it')()
const YJS = require('js-yaml')

function ts(kind = 'ts') {
  let timestamps = {}
  let ts = new Date().toJSON().replace(/[-T:.Z]/g, '')
  timestamps.d = Number(ts.substr(2, 6))
  timestamps.t = Number(ts.substr(8, 6))
  timestamps.ts = Number(ts)
  return timestamps[kind]
}
function nthIndex(str, pat, n) {
  var L = str.length,
    i = -1
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i)
    if (i < 0) break
  }
  return i
}
function splitDataFromMarkdown(content, search = '---', start = 1, end = 2) {
  //Find first ---
  let idx1 = nthIndex(content, search, start)
  //Find second ---
  let idx2 = nthIndex(content, search, end)

  let yaml = content.substring(idx1, idx2)
  // console.log({ idx1, idx2, yaml })

  if (yaml === '---\n') {
    yaml = {}
  }

  let len = 4 // 4 = ---\n
  let markdown = content.substring(idx2 + len)
  // console.log({ markdown })
  return [markdown, YJS.safeLoad(yaml)]
}

class Node extends Model {
  constructor({
    id = ts(),
    self = '',
    path = '/',
    meta = {},
    state = 'created',
    edges = [],
    name,
    mode,
    type,
    created,
    updated,
    matter,
    embed,
    link,
    attachment,
  }) {
    super()
    //used by system
    this.self = self.endsWith('/')
      ? Node.createName(path, meta.name, meta.created, meta.type)
      : self //internal ref
    this.path = path //internal ref path
    //
    this.id = id
    this.edges = edges
    this.state = state ? state : Node.determineState(self)
    this.meta = meta // holds all yaml data
    this.mode = mode //access
    this.created = created
    this.updated = updated
    this.matter = matter
    this.embed = embed //external ref needs hash?
    this.link = link // if external link included
    this.attachment = attachment
    this.descendants = Node.getEdges(id, 'd')
    this.fathers = Node.getEdges(id, 'f')
    this.associates = Node.getEdges(id, 'a')
    return this
  }
  static getEdges(id, rel) {
    let ids1, ids2
    //children
    // where im the source and rel is d
    // where im the target and rel f
    if (rel === 'd') {
      ids1 = Model.rawAll(
        'SELECT target AS id FROM edges WHERE source = $source AND relation = "d"',
        { source: id }
      )
      ids2 = Model.rawAll(
        'SELECT source AS id FROM edges WHERE target = $target AND relation = "f"',
        { target: id }
      )
    }

    //fathers
    //where im the target and rel f
    // where source and rel d
    if (rel === 'f') {
      ids1 = Model.rawAll(
        'SELECT target AS id FROM edges WHERE source = $source AND relation = "f"',
        { source: id }
      )
      ids2 = Model.rawAll(
        'SELECT source AS id FROM edges WHERE target = $target AND relation = "d"',
        { target: id }
      )
    }
    // assoc
    // where
    if (rel === 'a') {
      ids1 = Model.rawAll(
        'SELECT target FROM edges WHERE source = $source AND relation = "a"',
        { source: id }
      )
      ids2 = Model.rawAll(
        'SELECT source FROM edges WHERE target = $target AND relation = "a"',
        { target: id }
      )
    }
    let list = [...ids1.map((i) => i.id), ...ids2.map((i) => i.id)]
    console.log({ list })
    return list
  }
  static createName(path, name, ts = '', type = '', ext = '') {
    ts = ts || '200529'
    return path + '/' + name + '.' + ts + '.' + type + ext
  }
  static determineState(self) {
    return 'determiing??'
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
      { name: 'name', type: 'text' },
      { name: 'path', type: 'text' },
      { name: 'type', type: 'text' },
    ]
  }
  static async getFiles() {
    let data = []
    for await (const filename of this.walkDir(NOTES_PATH)) {
      // console.log(filename)
      let fileData = this.fileToNode(filename)
      // console.log({ fileData })
      let node = new this(fileData)
      data.push(node)
      // console.log({ node })
      // let used = process.memoryUsage().heapUsed / 1024 / 1024
      // console.log(
      //   `The script uses approximately ${Math.round(used * 100) / 100} MB`
      // )
    }
    return data
  }
  static async *walkDir(dir) {
    // console.log({ here: 'walking' })
    const dirents = await readdir(dir, { withFileTypes: true })
    // console.log({ here: 'dirents' })

    for (const dirent of dirents) {
      const res = resolve(dir, dirent.name)
      // console.log({ dirent })
      if (dirent.name[0] === '.') {
        continue
      }
      if (dirent.isDirectory()) {
        yield* this.walkDir(res)
      } else if (res.includes('.md')) {
        // console.log({ here: 'res' })
        yield res
      }
    }
  }
  static nodeToFileContents(node) {
    // console.log({ node })
    if (!node.self.endsWith('.md')) {
      let date = ts('d')
      node.self += `${node.meta.name.toLowerCase().replace(/ /g, '_')}.${date}.`

      if (node.meta.type) {
        node.self += `${node.meta.type}.`
      }
      node.self += 'md'
    }
    let contents = '---\n' + YJS.safeDump(node.meta) + '---\n' + node.matter.md
    // console.log({ file })
    let path = node.meta.self || node.self
    // console.log({ path })
    return [path.trim(), contents]
  }
  async save() {
    //desiredSelf
    //does it exist?
    // if this.state == stored
    // compare this.self to desiredSelf
    // if they are different, delete @this.self and save @desiredSelf
    if (this.state === 'stored') {
      //calculate current desired name
      let desiredPath = Node.createName(
        this.path,
        this.meta.name,
        this.meta.created,
        this.meta.type,
        'md'
      )
      console.log({ desiredPath })
      // grab path
      // compare to old path and name
      let selfHasChanged = this.self !== desiredPath
      if (selfHasChanged) {
        unlink(resolve(NOTES_PATH, this.self), (err) => {
          if (err) throw err
          console.log(this.self + ' was deleted')
        })
        this.self = desiredPath
      }
      //TODO we also could have several links that need to be removed
      // or connected to this new entry with its timestamp
    }

    if (!this.self.endsWith('.md')) {
      this.self += '.md'
    }
    this.meta.self = this.self
    this.meta.id = this.id
    //
    if (this.edges.length) {
      Model.run('DELETE FROM edges WHERE target = $id', { id: this.id })
      this.edges.map((edge) => {
        Model.run(
          'INSERT INTO edges (target, source, relation) VALUES($target, $source, $relation)',
          {
            target: this.id,
            source: edge.source,
            relation: edge.rel,
          }
        )
      })
    }
    let contents = '---\n' + YJS.safeDump(this.meta) + '---\n' + this.matter.md
    writeFileSync(NOTES_PATH + this.self, contents)
    this.state = 'stored'

    return this
  }

  static fileToNode(path) {
    let nPath = path.split(NOTES_PATH).join('')
    // console.log({ nPath })
    let mkdown
    let yata
    let content = readFileSync(path, 'utf8')
    // console.log({ content })
    if (content[0] === '-') {
      ;[mkdown, yata] = splitDataFromMarkdown(content)
      // console.log({ mkdown })
    } else {
      mkdown = content
      yata = {}
    }
    let folders = path.split('/')

    let id = folders.pop()
    let parent = folders.pop()
    let folder = parent
    let praz = ''

    let groups = [parent]
    if (folder !== 'praz') {
      praz = folders.pop()
      while (praz != 'praz') {
        folder = praz
        groups.push(folder)
        praz = folders.pop()
      }
    }
    // console.log({
    //   id,
    //   parent,
    //   folder,
    //   groups,
    // })

    //Adds dynamic data for META goodness
    // yata.path = p
    if (!yata.name) {
      //This needs to chop the ext .md off
      yata.name = yata.name ? yata.name : nPath.split('/').pop()
      let parts = yata.name.split('.')
      if (parts.length === 4) {
        yata.name = parts[0]
        yata.created = yata.created || parts[1]
        yata.type = yata.type || parts[2]
      }
    }

    return {
      id: yata.id || ts(),
      self: nPath,
      path: nPath.split('/').slice(0, -1).join('/'),
      state: 'stored',
      meta: yata,
      matter: {
        md: mkdown,
        html: MD.render(mkdown),
      },
      associates: [],
      fathers: [],
      descendants: [],
    }
  }
  static createFakeNode() {
    let data = {
      id: Faker.random.number(),
      self: 'node/' + Faker.random.number(),
      name: 'Example Node',
      mode: '600',
      type: 'book',
      created: Faker.date.past(),
      updated: Faker.date.past(),
      matter: { md: '# markdown', html: '<h1> markdown </h1>' },
      embed: '',
      link: '',
      attachment: '',
    }
    return new this(data)
  }
}

export default Node
