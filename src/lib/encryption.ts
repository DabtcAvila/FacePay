import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here'
const ALGORITHM = 'aes-256-gcm'

export function encryptData(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').subarray(0, 32), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

export function decryptData(encryptedData: { encrypted: string; iv: string; tag: string }): string {
  const iv = Buffer.from(encryptedData.iv, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').subarray(0, 32), iv)
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs')
    bcrypt.hash(password, 12, (err: any, hash: string) => {
      if (err) reject(err)
      else resolve(hash)
    })
  })
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const bcrypt = require('bcryptjs')
    bcrypt.compare(password, hash, (err: any, result: boolean) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}