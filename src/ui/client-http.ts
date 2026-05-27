export const clientHttpScript = String.raw`
async function post(path, body) {
  return request(path, 'POST', body)
}

async function patch(path, body) {
  return request(path, 'PATCH', body)
}

async function del(path) {
  return request(path, 'DELETE')
}

async function request(path, method, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: { message: 'Request failed' } }))
    throw new Error(payload.error?.message || 'Request failed')
  }
  return response.json().catch(() => null)
}
`
