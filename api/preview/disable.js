export default function handler(req, res) {
  const isLocalhost = (req.headers.host || '').startsWith('localhost')
  const expires = isLocalhost
    ? 'Path=/; SameSite=Lax; Max-Age=0'
    : 'Path=/; Secure; SameSite=None; Max-Age=0'

  res.setHeader('Set-Cookie', [
    `__sanity_preview=; ${expires}`,
    `sanity_preview_mode=; ${expires}`,
  ])

  res.writeHead(307, { Location: '/index3.html' })
  res.end()
}
