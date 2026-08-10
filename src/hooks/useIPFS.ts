import { useState } from 'react';

// No more client-side API keys — all uploads go through /api/upload-ipfs

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

      const response = await fetch('/api/upload-ipfs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed: ${response.statusText}`);
      }

      return await response.json();
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
      const response = await fetch('/api/upload-ipfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Metadata upload failed: ${response.statusText}`);
      }

      return await response.json();
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
