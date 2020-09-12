import Node from '$m/Node'
const { env } = require('@frontierjs/backend')
const md = require('markdown-it')()
const { readFileSync, statSync, writeFileSync } = require('fs')
const { readdir } = require('fs').promises
const { resolve } = require('path')

const NOTES_PATH = env.get('NOTES_PATH')

function fileObject (file, contents, stats) {
  const f = {
    id: stats.dev + '' + stats.ino,
    name: file,
    stats,
    perm: parseInt(stats.mode.toString(8), 10),
    contents
  }
  return f
}
// function fileObject2 (filename, markdown, data) {
//   const f = {
//     filename: filename,
//     data,
//     markdown,
//     html: md.render(markdown)
//   }
//   return f
// }

const FileController = {
  async brain (req, res) {
    // convert yaml in file to this

    const node = {
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
        { name: 'sibling2', descendants: [] }
      ]
      // associates: [proto, proto],
    }
    const proto = {
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
      associates: [node, node]
    }
    // node.children = [proto, proto, proto]
    const brain = {
      root: proto
    }
    res.json({ data: { brain } })
  },
  async brain2 (req, res) {
    const files = await Node.getFiles()
    const brain = { nodes: files }
    const root = brain.nodes.find((node) => node.meta.root)
    res.json({ data: { root, brain } })
  },
  async randomNode (req, res) {
    const node = await Node.createFakeNode()
    res.json({ data: { node } })
  },
  async allProcessed (req, res) {
    const filesList = await readdir(NOTES_PATH)
    const filenames = filesList.filter((filename) => filename.includes('.md'))

    const processed = filenames.map((filename) => {
      const fp = resolve(NOTES_PATH + filename)
      const content = readFileSync(fp, 'utf8')

      if (content[0] === '-') {
        const [md, data] = splitDataFromMarkdown(content)
        // console.log({ md, data })
        if (data && data.mode === 644) {
          return fileObject2(filename, md, data)
        }
      }
    })
    const newA = processed.filter((obj) => !!obj !== false)

    res.json({ data: newA })
  },

  async raw (req, res) {
    const data = []
    for await (const filename of walkDir(NOTES_PATH)) {
      data.push(getFile(filename))
    }

    res.json({ data, meta: { type: 'files', count: data.length } })
  },

  // TODO make this function work
  async articles ({ params }, res) {
    const nodes = await Node.getFiles()
    let list = nodes.filter((node) => node.meta.published === params.published)

    if (params.format === 'html') {
      list = list.map((node) => node.matter.html)
      return res.json({ data: list })
    }
    return res.json({ data: list })
  },

  async all (req, res) {
    const filesList = await readdir(NOTES_PATH)

    const files = filesList
      .filter((file) => file.includes('.md'))
      .map((file) => {
        const fp = NOTES_PATH + file
        const stats = statSync(fp)
        const contents = readFileSync(fp, 'utf8')
        return fileObject(file, stats, contents)
      })
    res.json({ data: files })
  },

  async get ({ params: { id } }, res) {
    let fp = ''
    const filesList = await readdir(NOTES_PATH)
    const file = filesList.find((file) => {
      fp = NOTES_PATH + file
      const { dev, ino } = statSync(fp)
      return id === dev + '' + ino
    })
    const stats = statSync(fp)
    const contents = readFileSync(fp, 'utf8')
    const f = {
      id: stats.dev + '' + stats.ino,
      name: file,
      stats,
      perm: parseInt(stats.mode.toString(8), 10),
      contents
    }
    res.json({ data: f })
  },
  // new Node File
  async store ({ body: { data } }, res) {
    const node = new Node(data)
    node.save()
    console.log({ stored: node })
    res.json({ data: node })
  },
  async update ({ body: { data } }, res) {
    const node = new Node(data)
    node.save()
    console.log({ updated: node })
    res.json({ data: node })
  },
  async destroy ({ params: { filepath } }, res) {
    // need to get full path from file or self
    const node = Node.get(filepath)
    console.log({ node })
    node.destroy()
    // node rm or move to .deleted
    res.json({ data: filepath })
  }
  // async update2 ({ body: { data } }, res) {
  //   // TODO replace with File Model
  //   // let fp = FileController2.find(id)
  //   let fp = ''
  //   const filesList = await readDir(NOTES_PATH)
  //   const f = filesList.find((file) => {
  //     fp = NOTES_PATH + file
  //     const { dev, ino } = statSync(fp)
  //     return id === dev + '' + ino
  //   })
  //   // console.log({f})
  //   // TODO Model file.save();
  //   writeFileSync(fp, data.contents)
  //   res.json({ data: f })
  // }
  // Shared by all functions: find file path based on id
//   async find (id) {
//     let fp = ''
//     const filesList = await readDir(NOTES_PATH)
//     filesList.find((file) => {
//       fp = NOTES_PATH + file
//       const { dev, ino } = statSync(fp)
//       return id === dev + '' + ino
//     })
//     return fp
//   }
}

export default FileController
