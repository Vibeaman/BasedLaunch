import { useState } from 'react';

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

interface UploadResult {
  ipfsHash: string;
  ipfsUrl: string;
}

export function useIPFS() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          type: 'token-image',
          platform: 'basedlaunch',
        },
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({
        cidVersion: 1,
      });
      formData.append('pinataOptions', options);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const ipfsHash = data.IpfsHash;

      return {
        ipfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      };
    } catch (err: any) {
      console.error('IPFS upload error:', err);
      setError(err.message || 'Failed to upload to IPFS');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadMetadata = async (metadata: {
    name: string;
    symbol: string;
    description?: string;
    image: string;
  }): Promise<UploadResult | null> => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.symbol}-metadata`,
            keyvalues: {
              type: 'token-metadata',
              platform: 'basedlaunch',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const ipfsHash = data.IpfsHash;

      return {
        ipfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      };
    } catch (err: any) {
      console.error('Metadata upload error:', err);
      setError(err.message || 'Failed to upload metadata to IPFS');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadImage,
    uploadMetadata,
    uploading,
    error,
  };
}
