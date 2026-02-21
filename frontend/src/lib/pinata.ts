/**
 * Pinata IPFS Upload Utility
 *
 * Handles uploading files and JSON metadata to IPFS via Pinata.
 * Used during NFT minting to store gift card images and metadata permanently.
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file (image) to IPFS via Pinata
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: `GiftChain-${file.name}`,
    keyvalues: { app: 'GiftChain', type: 'gift-image' },
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({ cidVersion: 1 });
  formData.append('pinataOptions', options);

  const res = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const data: PinataResponse = await res.json();
  return data.IpfsHash;
}

/**
 * Upload NFT metadata JSON to IPFS via Pinata.
 * Follows the OpenSea metadata standard.
 */
export interface GiftMetadata {
  name: string;
  description: string;
  image: string;          // ipfs://CID
  external_url?: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  properties: {
    category: string;
    brand: string;
    value: string;
    currency: string;
    encrypted_code?: string;
    expiry_date?: string;
  };
}

export async function uploadMetadataToIPFS(metadata: GiftMetadata): Promise<string> {
  const res = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `GiftChain-metadata-${metadata.name}`,
        keyvalues: { app: 'GiftChain', type: 'nft-metadata' },
      },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata metadata upload failed: ${err}`);
  }

  const data: PinataResponse = await res.json();
  return data.IpfsHash;
}

/**
 * Upload complete gift card NFT (image + metadata) to IPFS.
 * Returns the metadata CID for use in minting.
 */
export async function uploadGiftToIPFS(params: {
  imageFile: File;
  name: string;
  description: string;
  category: string;
  brand: string;
  value: string;
  currency: string;
  encryptedCode?: string;
  expiryDate?: string;
}): Promise<{ imageCID: string; metadataCID: string }> {
  // 1. Upload image
  console.log('[IPFS] Uploading image...');
  const imageCID = await uploadFileToIPFS(params.imageFile);
  console.log('[IPFS] Image uploaded:', imageCID);

  // 2. Build & upload metadata
  const metadata: GiftMetadata = {
    name: params.name,
    description: params.description,
    image: `ipfs://${imageCID}`,
    external_url: 'https://giftchain.app',
    attributes: [
      { trait_type: 'Category', value: params.category },
      { trait_type: 'Brand', value: params.brand },
      { trait_type: 'Value', value: params.value },
      { trait_type: 'Currency', value: params.currency },
    ],
    properties: {
      category: params.category,
      brand: params.brand,
      value: params.value,
      currency: params.currency,
      encrypted_code: params.encryptedCode,
      expiry_date: params.expiryDate,
    },
  };

  console.log('[IPFS] Uploading metadata...');
  const metadataCID = await uploadMetadataToIPFS(metadata);
  console.log('[IPFS] Metadata uploaded:', metadataCID);

  return { imageCID, metadataCID };
}

/** Get a public IPFS gateway URL for a CID */
export function ipfsGatewayURL(cid: string): string {
  // Use ipfs.io as it's the most standard gateway
  return `https://ipfs.io/ipfs/${cid}`;
}
