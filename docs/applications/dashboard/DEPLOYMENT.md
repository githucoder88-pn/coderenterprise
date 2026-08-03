# Deployment

```bash
cd dashboard
npm install
npm run build
npm run start  # or deploy to Vercel, Netlify, Cloudflare, etc.
```

The dashboard is a standard Next.js app. It is designed to be deployed behind the same
domain as the API in production (same-site cookies), but can run anywhere via bearer token.

Set `NEXT_PUBLIC_API_URL` to the backend base URL in production.
