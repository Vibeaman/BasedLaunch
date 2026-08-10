// Vercel Serverless Function — keeps Pinata keys server-side only.
// Handles both image uploads (multipart) and metadata uploads (JSON).

export const config = {
  api: {
    bodyParser: false, // we need raw body for multipart
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { PINATA_API_KEY, PINATA_SECRET_KEY } = process.env;
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    return res.status(500).json({ error: 'Pinata keys not configured on server' });
  }

  const contentType = req.headers['content-type'] || '';

  try {
    if (contentType.includes('application/json')) {
      // --- Metadata (JSON) upload ---
      const body = await readBody(req);
      const parsed = JSON.parse(body);

      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: JSON.stringify({
          pinataContent: parsed.metadata,
          pinataMetadata: {
            name: `${parsed.metadata.symbol}-metadata`,
            keyvalues: {
              type: 'token-metadata',
              platform: 'basedlaunch',
            },
          },
        }),
      });

      if (!pinataRes.ok) {
        const errText = await pinataRes.text();
        return res.status(pinataRes.status).json({ error: `Pinata error: ${errText}` });
      }

      const data = await pinataRes.json();
      return res.status(200).json({
        ipfsHash: data.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      });
    } else if (contentType.includes('multipart/form-data')) {
      // --- Image (file) upload ---
      // Stream the raw request body through to Pinata, rewriting headers
      const rawBody = await readRawBody(req);

      // Extract the boundary from the incoming content-type
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        return res.status(400).json({ error: 'Missing multipart boundary' });
      }

      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: rawBody,
      });

      if (!pinataRes.ok) {
        const errText = await pinataRes.text();
        return res.status(pinataRes.status).json({ error: `Pinata error: ${errText}` });
      }

      const data = await pinataRes.json();
      return res.status(200).json({
        ipfsHash: data.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      });
    } else {
      return res.status(400).json({ error: 'Unsupported content type' });
    }
  } catch (err) {
    console.error('upload-ipfs error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
