'use strict';

const { env } = require('@frontierjs/backend');
const { Model } = require('@frontierjs/backend');

const Faker = require('faker');
const { env: env$1 } = require('@frontierjs/backend');
const { Model: Model$1 } = require('@frontierjs/backend');
const NOTES_PATH = env$1.get('NOTES_PATH');
const { unlink, readFileSync, statSync, writeFileSync } = require('fs');
const { readdir } = require('fs').promises;
const { resolve } = require('path');
const MD = require('markdown-it')();
const YJS = require('js-yaml');

function ts(kind = 'ts') {
  let timestamps = {};
  let ts = new Date().toJSON().replace(/[-T:.Z]/g, '');
  timestamps.d = Number(ts.substr(2, 6));
  timestamps.t = Number(ts.substr(8, 6));
  timestamps.ts = [...ts].reverse().join('');
  return timestamps[kind]
}
function nthIndex(str, pat, n) {
  var L = str.length,
    i = -1;
  while (n-- && i++ < L) {
    i = str.indexOf(pat, i);
    if (i < 0) break
  }
  return i
}
function splitDataFromMarkdown$1(content, search = '---', start = 1, end = 2) {
  //Find first ---
  let idx1 = nthIndex(content, search, start);
  //Find second ---
  let idx2 = nthIndex(content, search, end);

  let yaml = content.substring(idx1, idx2);
  // console.log({ idx1, idx2, yaml })

  if (yaml === '---\n') {
    yaml = {};
  }

  let len = 4; // 4 = ---\n
  let markdown = content.substring(idx2 + len);
  // console.log({ markdown })
  return [markdown, YJS.safeLoad(yaml)]
}

class Node extends Model$1 {
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
    super();
    //used by system
    this.self = self.endsWith('/')
      ? Node.createName(path, meta.name.trim(), meta.created, meta.type)
      : self.trim(); //internal ref
    this.path = path; //internal ref path
    //
    this.id = id;
    this.edges = edges;
    this.state = state ? state : Node.determineState(self);
    this.meta = meta; // holds all yaml data
    this.mode = mode; //access
    this.created = created;
    this.updated = updated;
    this.matter = matter;
    this.embed = embed; //external ref needs hash?
    this.link = link; // if external link included
    this.attachment = attachment;
    this.descendants = Node.getEdges(self, 'd');
    this.fathers = Node.getEdges(self, 'f');
    this.associates = Node.getEdges(self, 'a');
    return this
  }
  static getEdges(id, rel) {
    let ids1, ids2;
    //children
    // where im the source and rel is d
    // where im the target and rel f
    if (rel === 'd') {
      ids1 = Model$1.rawAll(
        'SELECT target AS id FROM edges WHERE source = $source AND relation = "d"',
        { source: id }
      );
      ids2 = Model$1.rawAll(
        'SELECT source AS id FROM edges WHERE target = $target AND relation = "f"',
        { target: id }
      );
    }

    //fathers
    //where im the target and rel f
    // where source and rel d
    if (rel === 'f') {
      ids1 = Model$1.rawAll(
        'SELECT target AS id FROM edges WHERE source = $source AND relation = "f"',
        { source: id }
      );
      ids2 = Model$1.rawAll(
        'SELECT source AS id FROM edges WHERE target = $target AND relation = "d"',
        { target: id }
      );
    }
    // assoc
    // where
    if (rel === 'a') {
      ids1 = Model$1.rawAll(
        'SELECT target FROM edges WHERE source = $source AND relation = "a"',
        { source: id }
      );
      ids2 = Model$1.rawAll(
        'SELECT source FROM edges WHERE target = $target AND relation = "a"',
        { target: id }
      );
    }
    let list = [...ids1.map((i) => i.id), ...ids2.map((i) => i.id)];
    return list
  }
  static createName(path, name, timestamp = '', type = '', ext = '') {
    timestamp = timestamp || ts('d');
    path = path === '/' ? '' : path;

    return path + name + '.' + timestamp + '.' + type + ext
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
    let data = [];
    for await (const filename of this.walkDir(NOTES_PATH)) {
      // console.log(filename)
      let fileData = this.fileToNode(filename);
      // console.log({ fileData })
      let node = new this(fileData);
      data.push(node);
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
    const dirents = await readdir(dir, { withFileTypes: true });
    // console.log({ here: 'dirents' })

    for (const dirent of dirents) {
      const res = resolve(dir, dirent.name);
      // console.log({ dirent })
      if (dirent.name[0] === '.') {
        continue
      }
      if (dirent.isDirectory()) {
        yield* this.walkDir(res);
      } else if (res.includes('.md')) {
        // console.log({ here: 'res' })
        yield res;
      }
    }
  }
  static nodeToFileContents(node) {
    // console.log({ node })
    if (!node.self.endsWith('.md')) {
      let date = ts('d');
      node.self += `${node.meta.name.toLowerCase().replace(/ /g, '_')}.${date}.`;

      if (node.meta.type) {
        node.self += `${node.meta.type}.`;
      }
      node.self += 'md';
    }
    let contents = '---\n' + YJS.safeDump(node.meta) + '---\n' + node.matter.md;
    // console.log({ file })
    let path = node.meta.self || node.self;
    // console.log({ path })
    return [path.trim(), contents]
  }
  async destroy() {
    this.deleteEdges();
    unlink(resolve(NOTES_PATH, this.self), (err) => {
      if (err) throw err
    });
    return { status: 'deleted' }
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
        this.meta.name.trim().toLowerCase(),
        this.meta.created,
        this.meta.type,
        'md'
      );
      // grab path
      // compare to old path and name
      let selfHasChanged = this.self !== desiredPath;

      if (selfHasChanged) {
        unlink(resolve(NOTES_PATH, this.self), (err) => {
          if (err) throw err
        });
        this.self = desiredPath;
      }
      //TODO we also could have several links that need to be removed
      // or connected to this new entry with its timestamp
    }

    if (!this.self.endsWith('.md')) {
      this.self += 'md';
    }
    this.self = this.self.toLowerCase();

    this.meta.self = this.self;
    this.meta.id = this.id;

    if (this.edges.length) {
      this.handleEdges();
    }
    let contents = '---\n' + YJS.safeDump(this.meta) + '---\n' + this.matter.md;

    writeFileSync(resolve(NOTES_PATH, this.self), contents);
    this.state = 'stored';

    return this
  }

  deleteEdges() {
    Model$1.run('DELETE FROM edges WHERE target = $self', { self: this.self });
    Model$1.run('DELETE FROM edges WHERE source = $self', { self: this.self });
  }

  handleEdges() {
    Model$1.run('DELETE FROM edges WHERE target = $self', { self: this.self });
    this.edges.map((edge) => {
      Model$1.run(
        'INSERT INTO edges (target, source, relation) VALUES($target, $source, $relation)',
        {
          target: this.self,
          source: edge.source,
          relation: edge.rel,
        }
      );
    });
  }

  static fileToNode(path) {
    //TODO: decide where the NOTES_PATH gets used
    //ideally least amount places possible
    let nPath = path.split(NOTES_PATH).join('');
    // console.log({ nPath })
    let mkdown;
    let yata;
    let content = readFileSync(path, 'utf8');
    // console.log({ content })
    if (content[0] === '-') {
[mkdown, yata] = splitDataFromMarkdown$1(content);
      // console.log({ mkdown })
    } else {
      mkdown = content;
      yata = {};
    }
    let folders = path.split('/');

    let id = folders.pop();
    let parent = folders.pop();
    let folder = parent;
    let praz = '';
    if (folder !== 'praz') {
      praz = folders.pop();
      while (praz != 'praz') {
        folder = praz;
        praz = folders.pop();
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
      yata.name = yata.name ? yata.name : nPath.split('/').pop();
      let parts = yata.name.split('.');
      if (parts.length === 4) {
        yata.name = parts[0];
        yata.created = yata.created || parts[1];
        yata.type = yata.type || parts[2];
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
    };
    return new this(data)
  }
  static get(path) {
    let fileData = this.fileToNode(resolve(NOTES_PATH, path));
    return new this(fileData)
  }
  static getWhereMeta(field, value) {
    let path = 'jordan.200606.md';
    let fileData = this.fileToNode(resolve(NOTES_PATH, path));
    return new this(fileData)
  }
}

const { env: env$2 } = require('@frontierjs/backend');
const md = require('markdown-it')();
const { readFileSync: readFileSync$1, statSync: statSync$1, writeFileSync: writeFileSync$1 } = require('fs');
const { readdir: readdir$1 } = require('fs').promises;
const { resolve: resolve$1 } = require('path');

const NOTES_PATH$1 = env$2.get('NOTES_PATH');

function fileObject(file, contents, stats) {
  let f = {
    id: stats.dev + '' + stats.ino,
    name: file,
    stats,
    perm: parseInt(stats.mode.toString(8), 10),
    contents,
  };
  return f
}
function fileObject2(filename, markdown, data) {
  let f = {
    filename: filename,
    data,
    markdown,
    html: md.render(markdown),
  };
  return f
}

const FileController = {
  async brain(req, res) {
    // convert yaml in file to this

    let node = {
      id: 123456789,
      self: 'node/123456',
      created: '2020-05-03',
      updated: '2020-05-05',
      name: 'Frontier Project',
      matter: { md: '# Cool Markdown ', html: md.render('# Cool Markdown') },
      embed: '/?s=123456979',
      link: 'https://knight.works/articles/frontier-project',
      mode: 600,
      attachment: null,
      type: null,
      // fathers: [proto, proto],
      descendants: [
        { name: 'sibling!', descendants: [] },
        { name: 'sibling2', descendants: [] },
      ],
      // associates: [proto, proto],
    };
    let proto = {
      id: 123456789,
      created: '2020-05-03',
      updated: '2020-05-05',
      name: 'Frontier Project',
      matter: { md: '# Cool Markdown ', html: md.render('# Cool Markdown') },
      embed: '/?s=123456979',
      link: 'https://knight.works/articles/frontier-project',
      mode: 600,
      attachment: null,
      type: null,
      fathers: [node, node],
      descendants: [node, node, node],
      associates: [node, node],
    };
    // node.children = [proto, proto, proto]
    let brain = {
      root: proto,
    };
    res.json({ data: { brain } });
  },
  async brain2(req, res) {
    let files = await Node.getFiles();
    let brain = { nodes: files };
    let root = brain.nodes.find((node) => node.meta.root);
    res.json({ data: { root, brain } });
  },
  async randomNode(req, res) {
    let node = await Node.createFakeNode();
    res.json({ data: { node } });
  },
  async allProcessed(req, res) {
    let filesList = await readdir$1(NOTES_PATH$1);
    let filenames = filesList.filter((filename) => filename.includes('.md'));

    let processed = filenames.map((filename) => {
      let fp = resolve$1(NOTES_PATH$1 + filename);
      let content = readFileSync$1(fp, 'utf8');

      if (content[0] === '-') {
        let [md, data] = splitDataFromMarkdown(content);
        // console.log({ md, data })
        if (data && data.mode == 644) {
          return fileObject2(filename, md, data)
        }
      }
    });
    let newA = processed.filter((obj) => !!obj !== false);

    res.json({ data: newA });
  },

  async raw(req, res) {
    let data = [];
    for await (const filename of walkDir(NOTES_PATH$1)) {
      data.push(getFile(filename));
    }

    res.json({ data, meta: { type: 'files', count: data.length } });
  },

  //TODO make this function work
  async articles({ params }, res) {
    let nodes = await Node.getFiles();
    let list = nodes.filter((node) => node.meta.published === params.published);

    if (params.format === 'html') {
      list = list.map((node) => node.matter.html);
      return res.json({ data: list })
    }
    return res.json({ data: list })
  },

  async all(req, res) {
    let filesList = await readDir(NOTES_PATH$1);

    let files = filesList
      .filter((file) => file.includes('.md'))
      .map((file) => {
        let fp = NOTES_PATH$1 + file;
        let stats = statSync$1(fp);
        let contents = readFileSync$1(fp, 'utf8');
        return fileObject(file, stats, contents)
      });
    res.json({ data: files });
  },

  async get({ params: { id } }, res) {
    let fp = '';
    let filesList = await readDir(NOTES_PATH$1);
    let file = filesList.find((file) => {
      fp = NOTES_PATH$1 + file;
      let { dev, ino } = statSync$1(fp);
      return id == dev + '' + ino
    });
    let stats = statSync$1(fp);
    let contents = readFileSync$1(fp, 'utf8');
    let f = {
      id: stats.dev + '' + stats.ino,
      name: file,
      stats,
      perm: parseInt(stats.mode.toString(8), 10),
      contents,
    };
    res.json({ data: f });
  },
  //new Node File
  async store({ body: { data } }, res) {
    let node = new Node(data);
    node.save();
    res.json({ data: node });
  },
  async update({ body: { data } }, res) {
    let node = new Node(data);
    node.save();
    res.json({ data: node });
  },
  async destroy({ params: { filepath } }, res) {
    //need to get full path from file or self
    let node = Node.get(filepath);
    node.destroy();
    // node rm or move to .deleted
    res.json({ data: filepath });
  },
  async update2({ body: { data } }, res) {
    //TODO replace with File Model
    // let fp = FileController2.find(id)
    let fp = '';
    let filesList = await readDir(NOTES_PATH$1);
    let f = filesList.find((file) => {
      fp = NOTES_PATH$1 + file;
      let { dev, ino } = statSync$1(fp);
      return id == dev + '' + ino
    });
    // console.log({f})
    //TODO Model file.save();
    writeFileSync$1(fp, data.contents);
    res.json({ data: f });
  },
  // Shared by all functions: find file path based on id
  async find(id) {
    let fp = '';
    let filesList = await readDir(NOTES_PATH$1);
    let file = filesList.find((file) => {
      fp = NOTES_PATH$1 + file;
      let { dev, ino } = statSync$1(fp);
      return id == dev + '' + ino
    });
    return fp
  },
};

const { env: env$3 } = require('@frontierjs/backend');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Model: Model$2 } = require('@frontierjs/backend');
let REFRESH_TOKEN_SECRET = env$3.get('REFRESH_TOKEN_SECRET');
let ACCESS_TOKEN_SECRET = env$3.get('ACCESS_TOKEN_SECRET');

class User extends Model$2 {
  constructor({
    id = null,
    email = '',
    password = '',
    date_added = new Date().toJSON()
  } = {}) {
    super();
    this.id = id;
    this.email = email;
    this.password = password;
    this.date_added = date_added;
    return this
  }
  static get useSoftDeletes() {
    return true
  }
  static get hidden() {
    return ['password']
  }
  static get guarded() {
    return ['is_deleted', 'date_added']
  }
  static get fields() {
    return [
      {
        name: 'id',
        type: 'integer',
        opts: 'NOT NULL PRIMARY KEY AUTOINCREMENT'
      },
      { name: 'email', type: 'text' },
      { name: 'password', type: 'text' },
      { name: 'date_added', type: 'text' },
      { name: 'is_deleted', type: 'text' }
    ]
  }
  static findByEmail(email) {
    let data = this._getWhere('email', email);
    return data ? new this(data) : null
  }
  static async validateThenStore({ email, password }) {
    //Need to validate data
    try {
      if (this.emailTaken(email)) return { error: 'Email Taken 1' }

      let hashedPassword = await bcrypt.hash(password, 10);
      let result = this.create({ email, password: hashedPassword });
      return result
    } catch (e) {
      return void 0
    }
  }
  static emailTaken(email) {
    return this._getWhere('email', email)
  }

  async auth(pw) {
    let sql = 'SELECT password FROM users where id = $id';
    let { password } = this._.raw(sql, { id: this.id }) || {};
    if (await bcrypt.compare(pw, password)) return 'success'
    else return null
  }
  login() {
    let accessToken = this.generateAccessToken(ACCESS_TOKEN_SECRET);
    let refreshToken = this.generateAccessToken(REFRESH_TOKEN_SECRET);
    return { accessToken, refreshToken }
  }
  generateAccessToken(token, expiration = '24h') {
    return jwt.sign({ id: this.id, email: this.email }, token, {
      expiresIn: expiration
    })
  }
}

const { env: env$4 } = require('@frontierjs/backend');
const jwt$1 = require('jsonwebtoken');

let ACCESS_TOKEN_SECRET$1 = env$4.get('ACCESS_TOKEN_SECRET');
let REFRESH_TOKEN_SECRET$1 = env$4.get('REFRESH_TOKEN_SECRET');

//fix
let refreshTokens = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGVtYWlsLmNvbSIsInBhc3N3b3JkIjoiJDJiJDEwJEJJQVVLRmJCakk2dGxHQVFxVTNHNnViQUNLS2tTZWkyUGNxRlZESE1acmU2VEJtekUwOGpTIiwiaWF0IjoxNTcyNzIzMzM2fQ.H94OYXkcQKEsaYP4m549g47ch5VfJA_1v2RtU-_JsMs'
];
const AuthController = {
  async register(req, res) {
    // console.log({req})
    //validate request
    try {
      let user = ({ email, password } = req.body);
      res.status(201).send(await User.validateThenStore(user));
    } catch (e) {
      res.status(500).send();
    }
  },
  async login({ body: { email, password } }, res) {
    let user = User.findByEmail(email);
    if (!user) return res.sendStatus(401)

    try {
      if (await user.auth(password)) {
        let { accessToken, refreshToken } = await user.login();
        refreshTokens.push(refreshToken);
        res.json({ accessToken: accessToken, refreshToken: refreshToken, user });
      } else {
        return res.sendStatus(401)
      }
    } catch (e) {
      return res.status(401).json({ message: 'You are not registered!' })
    }
  },

  refresh(req, res) {
    const refreshToken = req.body.token;
    if (refreshToken == null) return res.sendStatus(401)
    if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)

    jwt$1.verify(refreshToken, REFRESH_TOKEN_SECRET$1, async (err, userData) => {
      if (err) return res.sendStatus(403)
      let user = User.find(userData.id);
      let { accessToken } = await user.login();
      res.json({ accessToken });
    });
  },

  async verify(req, res) {
    res.json({ message: 'Valid Token', user: req.user });
  },

  logout(req, res) {
    //reqork this into DB
    refreshTokens = refreshTokens.filter(token => token !== req.body.token);
    res.sendStatus(204);
  },
  // Middleware Testing
  authenticateTokenMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).send({ error: 'denied' })

    jwt$1.verify(token, ACCESS_TOKEN_SECRET$1, (err, user) => {
      if (err) return res.status(403).send({ error: 'unauthorized' })
      req.user = user;
      next();
    });
  }
};

let express = require('express');
let router = express.Router();

const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.use('/', (req, res, next) => {
  // console.log({ body: req.user })
  next();
});

router.get(
  '/',
  // AuthController.authenticateTokenMiddleware,
  FileController.allProcessed
);
router.get(
  '/published/:published/:format*?',
  // AuthController.authenticateTokenMiddleware,
  FileController.articles
);
router.get(
  '/brain',
  // AuthController.authenticateTokenMiddleware,
  FileController.brain
);
router.get(
  '/brain2',
  // AuthController.authenticateTokenMiddleware,
  FileController.brain2
);
router.post(
  '/',
  // AuthController.authenticateTokenMiddleware,
  FileController.store
);
router.get(
  '/node',
  // AuthController.authenticateTokenMiddleware,
  FileController.randomNode
);
router.get(
  '/articles/:published',
  // AuthController.authenticateTokenMiddleware,
  FileController.articles
);
router.delete(
  '/:filepath',
  // AuthController.authenticateTokenMiddleware,
  FileController.destroy
);
router.get(
  '/raw',
  // AuthController.authenticateTokenMiddleware,
  FileController.raw
);
router.get(
  '/all',
  // AuthController.authenticateTokenMiddleware,
  FileController.all
);

router.get(
  '/:id',
  AuthController.authenticateTokenMiddleware,
  FileController.get
);
router.patch(
  '/',
  //AuthController.authenticateTokenMiddleware,
  FileController.update
);

const { env: env$5 } = require('@frontierjs/backend');

const jwt$2 = require('jsonwebtoken');

let ACCESS_TOKEN_SECRET$2 = env$5.get('ACCESS_TOKEN_SECRET');
let REFRESH_TOKEN_SECRET$2 = env$5.get('REFRESH_TOKEN_SECRET');

//fix
let refreshTokens$1 = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGVtYWlsLmNvbSIsInBhc3N3b3JkIjoiJDJiJDEwJEJJQVVLRmJCakk2dGxHQVFxVTNHNnViQUNLS2tTZWkyUGNxRlZESE1acmU2VEJtekUwOGpTIiwiaWF0IjoxNTcyNzIzMzM2fQ.H94OYXkcQKEsaYP4m549g47ch5VfJA_1v2RtU-_JsMs'
];
const UserController = {
  index(req, res) {
    let users = User._getAll();
    return res.json(users)
  },
  all(req, res) {
    let users = User.getAll({ withDeleted: true })[0]._._getAll({
      withDeleted: true
    });
    return res.json(users)
  },
  async store(req, res) {
    let user = ({ email, password } = req.body);
    res.status(201).send(await User.validateThenStore(user));
  },
  destroy(req, res) {
    User.delete(parseInt(req.params.id));

    return res.json({ ok: true })
  },
  restore({ params: { id } }, res) {
    let user = User.restore(parseInt(id));
    res.json(user);
  },
  logout(req, res) {
    //reqork this into DB
    refreshTokens$1 = refreshTokens$1.filter(token => token !== req.body.token);
    res.sendStatus(204);
  },
  // Middleware Testing
  authenticateTokenMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401)

    jwt$2.verify(token, ACCESS_TOKEN_SECRET$2, (err, user) => {
      if (err) return res.sendStatus(403)
      req.user = user;
      next();
    });
  }
};

//register, login, logout, refreshtokens, verify
let express$1 = require('express');
let router$1 = express$1.Router();

const bodyParser$1 = require('body-parser');
router$1.use(bodyParser$1.urlencoded({ extended: false }));
router$1.use(bodyParser$1.json());

router$1.use('/', (req, res, next) => {
  // console.log({body: req.body})
  next();
});

router$1.use('/files', router);

router$1.get(
  '/users',
  AuthController.authenticateTokenMiddleware,
  UserController.index
);
router$1.get('/users/free', UserController.index);
router$1.get(
  '/users/all',
  AuthController.authenticateTokenMiddleware,
  UserController.all
);
router$1.post('/users', UserController.store);
router$1.delete('/users/:id', UserController.destroy);
router$1.patch('/users/:id/restore', UserController.restore);

router$1.post('/register', AuthController.register);
router$1.post('/login', AuthController.login);
router$1.post('/refresh', AuthController.refresh);
router$1.get(
  '/verify',
  AuthController.authenticateTokenMiddleware,
  AuthController.verify
);
router$1.post('/logout', AuthController.logout);

const { env: env$6 } = require('@frontierjs/backend');
const helmet = require('helmet');
const cors = require('cors');

let server = require('express')();

server.use(cors());
server.use(helmet());
server.use(helmet.hidePoweredBy({ setTo: 'PHP 3.3.0' }));
server.use('/api/v1', router$1);

const { env: env$7 } = require('@frontierjs/backend');

let port = env$7.get('PORT');

server.listen(port, () =>
  void 0
);
