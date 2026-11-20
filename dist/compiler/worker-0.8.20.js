if (typeof Module === 'undefined') importScripts('./soljson-0.8.20.js')

const compile = Module.cwrap('solidity_compile', 'string', ['string', 'number', 'number'])
const version = Module.cwrap('solidity_version', 'string', [])
const reset = Module.cwrap('solidity_reset', null, [])

self.onmessage = ({ data }) => {
  try {
    const compilerVersion = version().split('.Emscripten')[0]
    const output = JSON.parse(compile(JSON.stringify(data), 0, 0))
    reset()
    self.postMessage({ output, compilerVersion })
  } catch (error) {
    self.postMessage({ error: error.message })
  }
}
