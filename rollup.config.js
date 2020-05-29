import path from 'path'
import { terser } from 'rollup-plugin-terser'
import alias from '@rollup/plugin-alias'
import strip from '@rollup/plugin-strip'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import builtins from 'builtin-modules'
import copy from 'rollup-plugin-copy'

const production = !process.env.ROLLUP_WATCH
const projectRoot = path.resolve(__dirname)

export default {
  input: 'src/index.js',
  output: {
    file: 'build/api.js',
    format: 'cjs',
  },
  external: builtins,
  plugins: [
    alias({
      entries: [
        {
          find: '$c',
          replacement: path.resolve(projectRoot, 'src/Controllers'),
        },
        { find: '$m', replacement: path.resolve(projectRoot, 'src/Models') },
        {
          find: '$frontier',
          replacement: path.resolve(
            projectRoot,
            'node_modules/@frontierjs/backend'
          ),
        },
      ],
    }),
    copy({
      targets: [{ src: ['package.json', 'package-lock.json'], dest: 'build' }],
      copyOnce: true,
    }),
    // resolve(),
    // In dev mode, call `npm run watch` once
    // the bundle has been generated
    !production && serve(),
    // strip()
    // terser()
    // Watch the `dist` directory and refresh the
    // browser on changes when not in production
    // !production && refreshBrowser(),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && strip(),
  ],
}

function serve() {
  let started = false

  return {
    writeBundle() {
      if (!started) {
        started = true

        require('child_process').spawn('npm', ['run', 'watch', '--'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        })
      }
    },
  }
}

function refreshBrowser() {
  let started = false

  return {
    writeBundle() {
      if (!started) {
        started = true

        require('child_process').spawn('npm', ['run', 'broswer:reload'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        })
      }
    },
  }
}
