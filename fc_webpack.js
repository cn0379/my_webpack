const fs = require('fs')
const parser = require("@babel/parser")
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')
const path = require('path')
let ID = 0

function createAssets(filname) {
  const content = fs.readFileSync(filname, 'utf-8')
  const ast = parser.parse(content, {
    sourceType: 'module'
  })
  const dependences = []
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependences.push(node.source.value)
    }
  })


  const { code } = babel.transformFromAstSync(ast, null, {
    presets: ['@babel/preset-env'],
    plugins: []
  })

  let id = ID++

  return {
    filname,
    code,
    dependences,
    id
  }
}

function createGraph(entry) {
  const mainAssets = createAssets(entry)

  const queue = [mainAssets]

  for (const aseet of queue) {
    const dirName = path.dirname(aseet.filname)
    
    aseet.mappig = {}

    aseet.dependences.forEach(relativePath => {
      const absolutePath = path.join(dirName, relativePath)
      const child = createAssets(absolutePath)
      aseet.mappig[relativePath]  = child.id
      queue.push(child)
    })
  }

  return queue
  
}

function bundle(graph) {
  let modules = ''
  graph.forEach( mod => {
    modules += `${mod.id}: [
        function(require,module,exports) {
          ${mod.code}
        },
        ${JSON.stringify(mod.mappig)}
    ],`
  })
  const result = `(function(){
      function require(id) {
        const [ fn, mapping ] = modules[id]
        function localRequire(relpath) {
          return require(mapping[relpath])
        }
        const module = {
          exports: {

          }
        }
        fn(localRequire,module,module.exports)
        return module.exports
      }

      require(0)

  })(${modules})`

  return result
}


const graph = createGraph('./src/index.js')
const result = bundle(graph)
console.log(result );

