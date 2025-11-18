// Test setup file that configures environment + path aliases
// This must be required before any test files
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const tsConfigPaths = require('tsconfig-paths')

// 1) Load environment variables (prefers .env.test.local → .env.test → .env)
const envFiles = ['.env.test.local', '.env.test', '.env']
for (const file of envFiles) {
  const resolved = path.resolve(__dirname, '..', file)
  if (fs.existsSync(resolved)) {
    dotenv.config({ path: resolved })
    console.log(`✅ Loaded env vars for tests from ${file}`)
    break
  }
}

// 2) Register path mappings to point to compiled .test-dist directory
const baseUrl = path.resolve(__dirname, '..', '.test-dist')
tsConfigPaths.register({
  baseUrl,
  paths: {
    '@/*': ['./*']
  }
})

console.log('✅ Test environment configured with path aliases (@/* → .test-dist/*)')
