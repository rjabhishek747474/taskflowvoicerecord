import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { auth } from './auth';

const app = new Hono();

// CORS for Frontend
app.use('*', cors({
    origin: ['http://localhost:3000'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}));

// BetterAuth Handler
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
    return auth.handler(c.req.raw);
});

app.get('/', (c) => {
    return c.text('TaskFlow AI API is running on Port 3001');
});

// Serve Frontend (After API routes)
app.use('/*', serveStatic({
    root: './dist',
}));

// Fallback for SPA (index.html) if not found (Handled by serveStatic usually, but need catch-all)
app.get('*', serveStatic({
    path: './dist/index.html',
}));

const port = Number(process.env.PORT) || 3001;
console.log(`Server is running on port ${port}`);

serve({
    fetch: app.fetch,
    port
});
