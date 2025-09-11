import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn function (class name utility)', () => {
    it('should combine class names correctly', () => {
      const result = cn('class1', 'class2')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional')
      expect(result).toContain('base')
      expect(result).toContain('conditional')
    })

    it('should ignore falsy values', () => {
      const result = cn('base', false && 'hidden', null, undefined)
      expect(result).toContain('base')
      expect(result).not.toContain('hidden')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(typeof result).toBe('string')
    })
  })

  describe('Basic functionality', () => {
    it('should pass basic test', () => {
      expect(1 + 1).toBe(2)
    })

    it('should handle strings', () => {
      const test = 'hello world'
      expect(test).toBe('hello world')
      expect(test.length).toBe(11)
    })

    it('should handle arrays', () => {
      const arr = [1, 2, 3]
      expect(arr).toHaveLength(3)
      expect(arr[0]).toBe(1)
    })

    it('should handle objects', () => {
      const obj = { name: 'test', value: 123 }
      expect(obj.name).toBe('test')
      expect(obj.value).toBe(123)
      expect(Object.keys(obj)).toHaveLength(2)
    })
  })
})