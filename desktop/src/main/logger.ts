export function log(message: string, data?: any) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19)
  if (data) {
    console.log(`[${ts}] ${message}`, JSON.stringify(data))
  } else {
    console.log(`[${ts}] ${message}`)
  }
}
