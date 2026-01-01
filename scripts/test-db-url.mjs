import dotenv from 'dotenv'

dotenv.config()

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL)
    console.log('Host:', url.hostname)
    console.log('Port:', url.port)
    console.log('Database:', url.pathname.slice(1))
    console.log('Username:', url.username)
    console.log('Password (type):', typeof url.password)
    console.log('Password (first 10 chars):', url.password.slice(0, 10))
  } catch (err) {
    console.error('Failed to parse URL:', err.message)
  }
}
