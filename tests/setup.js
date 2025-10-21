// Test setup file that configures path aliases
// This must be required before any test files
const tsConfigPaths = require('tsconfig-paths')
const path = require('path')

// Register path mappings to point to compiled .test-dist directory
const baseUrl = path.resolve(__dirname, '..', '.test-dist')
tsConfigPaths.register({
  baseUrl: baseUrl,
  paths: {
    '@/*': ['./*']
  }
})

console.log('✅ Test environment configured with path aliases (@/* → .test-dist/*)')
