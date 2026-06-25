export default function handler(req, res) {
  var isLocalhost = (req.headers.host || '').startsWith('localhost')
  var cookieAttrs = isLocalhost
    ? 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    : 'Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0'

  res.setHeader('Set-Cookie', `__sanity_preview=; ${cookieAttrs}`)
  res.writeHead(307, { Location: '/index3.html' })
  res.end()
}
