const { env } = require('@frontierjs/backend')
const md = require('markdown-it')()
const { readFileSync, statSync, writeFileSync } = require('fs')
const { readdir } = require('fs').promises
const { resolve } = require('path')

import Node from '$m/Node'

const NOTES_PATH = env.get('NOTES_PATH')

function fileObject(file, contents, stats) {
  let f = {
    id: stats.dev + '' + stats.ino,
    name: file,
    stats,
    perm: parseInt(stats.mode.toString(8), 10),
    contents,
  }
  return f
}
function fileObject2(filename, markdown, data) {
  let f = {
    filename: filename,
    data,
    markdown,
    html: md.render(markdown),
  }
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
    }
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
    }
    // node.children = [proto, proto, proto]
    let brain = {
      root: proto,
    }
    res.json({ data: { brain } })
  },
  async brain2(req, res) {
    let files = await Node.getFiles()
    let brain = { nodes: files }
    let root = brain.nodes.find((node) => node.meta.root)
    res.json({ data: { root, brain } })
  },
  async randomNode(req, res) {
    let node = await Node.createFakeNode()
    res.json({ data: { node } })
  },
  async allProcessed(req, res) {
    let filesList = await readdir(NOTES_PATH)
    let filenames = filesList.filter((filename) => filename.includes('.md'))

    let processed = filenames.map((filename) => {
      let fp = resolve(NOTES_PATH + filename)
      let content = readFileSync(fp, 'utf8')

      if (content[0] === '-') {
        let [md, data] = splitDataFromMarkdown(content)
        // console.log({ md, data })
        if (data && data.mode == 644) {
          return fileObject2(filename, md, data)
        }
      }
    })
    let newA = processed.filter((obj) => !!obj !== false)

    res.json({ data: newA })
  },

  async raw(req, res) {
    let data = []
    for await (const filename of walkDir(NOTES_PATH)) {
      data.push(getFile(filename))
    }

    res.json({ data, meta: { type: 'files', count: data.length } })
  },

  //TODO make this function work
  async articles({ params: { published, format } }, res) {
    let node = Node.getWhere('meta.published', published)
    if (format === 'html') {
      return res.json({ data: node.matter.html })
    }
    return res.json({ data: node.matter.md })
  },
  async all(req, res) {
    let filesList = await readDir(NOTES_PATH)

    let files = filesList
      .filter((file) => file.includes('.md'))
      .map((file) => {
        let fp = NOTES_PATH + file
        let stats = statSync(fp)
        let contents = readFileSync(fp, 'utf8')
        return fileObject(file, stats, contents)
      })
    res.json({ data: files })
  },

  async get({ params: { id } }, res) {
    let fp = ''
    let filesList = await readDir(NOTES_PATH)
    let file = filesList.find((file) => {
      fp = NOTES_PATH + file
      let { dev, ino } = statSync(fp)
      return id == dev + '' + ino
    })
    let stats = statSync(fp)
    let contents = readFileSync(fp, 'utf8')
    let f = {
      id: stats.dev + '' + stats.ino,
      name: file,
      stats,
      perm: parseInt(stats.mode.toString(8), 10),
      contents,
    }
    res.json({ data: f })
  },
  //new Node File
  async store({ body: { data } }, res) {
    let node = new Node(data)
    node.save()
    console.log({ stored: node })
    res.json({ data: node })
  },
  async update({ body: { data } }, res) {
    let node = new Node(data)
    node.save()
    console.log({ updated: node })
    res.json({ data: node })
  },
  async destroy({ params: { filepath } }, res) {
    //need to get full path from file or self
    let node = Node.get(filepath)
    console.log({ node })
    node.destroy()
    // node rm or move to .deleted
    res.json({ data: filepath })
  },
  async update2({ body: { data } }, res) {
    //TODO replace with File Model
    // let fp = FileController2.find(id)
    let fp = ''
    let filesList = await readDir(NOTES_PATH)
    let f = filesList.find((file) => {
      fp = NOTES_PATH + file
      let { dev, ino } = statSync(fp)
      return id == dev + '' + ino
    })
    // console.log({f})
    //TODO Model file.save();
    writeFileSync(fp, data.contents)
    res.json({ data: f })
  },
  // Shared by all functions: find file path based on id
  async find(id) {
    let fp = ''
    let filesList = await readDir(NOTES_PATH)
    let file = filesList.find((file) => {
      fp = NOTES_PATH + file
      let { dev, ino } = statSync(fp)
      return id == dev + '' + ino
    })
    return fp
  },
}
export default FileController
