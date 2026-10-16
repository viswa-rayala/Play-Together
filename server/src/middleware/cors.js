/**
 * CORS Middleware
 * Allows cross-origin requests from web clients (Vercel, local dev, mobile).
 */
export function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}
