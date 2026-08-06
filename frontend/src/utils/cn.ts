type ClassValue = string | boolean | undefined | null | number | ClassValue[] | Record<string, boolean>

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []
  for (const input of inputs) {
    if (typeof input === 'string') {
      classes.push(input)
    } else if (typeof input === 'boolean' || input === undefined || input === null || typeof input === 'number') {
      // skip falsy values and numbers
    } else if (Array.isArray(input)) {
      const result = cn(...input)
      if (result) classes.push(result)
    } else if (typeof input === 'object' && input !== null) {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key)
      }
    }
  }
  return classes.join(' ')
}
