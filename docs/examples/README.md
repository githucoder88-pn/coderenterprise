# Examples

## curl: sign in
```bash
curl -X POST http://localhost:3000/api/v1/auth/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"••••••••"}'
```

## curl: send a message (streaming)
```bash
curl -N -X POST http://localhost:3000/api/v1/conversations/<id>/send/stream \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Explain dependency injection in 3 sentences."}'
```

## Node/JS: stream completions
```js
const res = await fetch(`${API}/conversations/${cid}/send/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ content: 'Hello' }),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buf = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  for (const line of buf.split('\n')) {
    if (line.startsWith('data: ')) {
      const d = line.slice(6).trim();
      if (d === '[DONE]') break;
      const p = JSON.parse(d);
      if (p.delta?.content) process.stdout.write(p.delta.content);
    }
  }
}
```

## CLI
```bash
coder login
coder chat "Explain the DI container"
coder providers list
coder models list --provider openai
```
