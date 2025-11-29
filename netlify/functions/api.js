/**
 * Netlify Serverless Function - FACEIT API Proxy
 * Handles CORS by proxying requests to FACEIT API
 */

export async function handler(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Extract the path from query parameters
  const path = event.queryStringParameters.path || '';

  if (!path) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing path parameter' })
    };
  }

  // Construct FACEIT API URL
  const faceitUrl = `https://open.faceit.com/data/v4/${path}`;

  try {
    // Forward the request to FACEIT API
    const headers = {
      'Accept': 'application/json',
    };

    // Forward Authorization header if present
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(faceitUrl, {
      method: 'GET',
      headers: headers
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: data
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch from FACEIT API', message: error.message })
    };
  }
}
