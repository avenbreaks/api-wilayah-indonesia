/**
 * API Wilayah Indonesia - Cloudflare Worker
 * 
 * Worker ini melayani API statis data wilayah Indonesia
 * menggunakan Cloudflare KV untuk penyimpanan data.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=86400, s-maxage=604800',
  ...CORS_HEADERS,
};

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
  ...CORS_HEADERS,
};

const CSS_HEADERS = {
  'Content-Type': 'text/css; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
  ...CORS_HEADERS,
};

const JS_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
  ...CORS_HEADERS,
};

const IMAGE_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=604800',
  ...CORS_HEADERS,
};

/**
 * Handle API requests
 */
async function handleApiRequest(request, env, path) {
  const kvKey = `api:${path}`;
  
  // Try to get from KV
  const data = await env.WILAYAH_KV.get(kvKey, { type: 'json' });
  
  if (data === null) {
    return new Response(JSON.stringify({ error: 'Not found', path }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  }
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

/**
 * Handle static assets (HTML, CSS, JS, images)
 */
async function handleStaticAsset(request, env, path) {
  const kvKey = `static:${path}`;
  
  // Determine content type
  let headers = HTML_HEADERS;
  let type = 'text';
  
  if (path.endsWith('.css')) {
    headers = CSS_HEADERS;
  } else if (path.endsWith('.js')) {
    headers = JS_HEADERS;
  } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    headers = IMAGE_HEADERS;
    type = 'arrayBuffer';
  }
  
  const data = await env.WILAYAH_KV.get(kvKey, { type });
  
  if (data === null) {
    return new Response('Not found', { status: 404, headers: HTML_HEADERS });
  }
  
  if (type === 'arrayBuffer') {
    return new Response(data, { status: 200, headers });
  }
  
  return new Response(data, { status: 200, headers });
}

/**
 * Parse the request path and route accordingly
 */
function parseRoute(pathname) {
  // Remove leading slash
  const path = pathname.replace(/^\//, '');
  
  // API routes
  const apiPatterns = [
    // List endpoints
    { pattern: /^api\/provinces\.json$/, key: 'provinces' },
    { pattern: /^api\/regencies\/(\d+)\.json$/, key: (m) => `regencies/${m[1]}` },
    { pattern: /^api\/districts\/(\d+)\.json$/, key: (m) => `districts/${m[1]}` },
    { pattern: /^api\/villages\/(\d+)\.json$/, key: (m) => `villages/${m[1]}` },
    
    // Single entity endpoints
    { pattern: /^api\/province\/(\d+)\.json$/, key: (m) => `province/${m[1]}` },
    { pattern: /^api\/regency\/(\d+)\.json$/, key: (m) => `regency/${m[1]}` },
    { pattern: /^api\/district\/(\d+)\.json$/, key: (m) => `district/${m[1]}` },
    { pattern: /^api\/village\/(\d+)\.json$/, key: (m) => `village/${m[1]}` },
  ];
  
  for (const { pattern, key } of apiPatterns) {
    const match = path.match(pattern);
    if (match) {
      return {
        type: 'api',
        key: typeof key === 'function' ? key(match) : key,
      };
    }
  }
  
  // Static assets
  if (path === '' || path === 'index.html') {
    return { type: 'static', key: 'index.html' };
  }
  
  if (path.startsWith('css/') || path.startsWith('js/') || path.startsWith('img/')) {
    return { type: 'static', key: path };
  }
  
  return { type: 'notfound' };
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    
    // Only allow GET and HEAD
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }
    
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    
    switch (route.type) {
      case 'api':
        return handleApiRequest(request, env, route.key);
      case 'static':
        return handleStaticAsset(request, env, route.key);
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: JSON_HEADERS,
        });
    }
  },
};
