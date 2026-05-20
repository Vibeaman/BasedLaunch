import { useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export interface TokenDetails {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  virtualSol: number;
  virtualTokens: number;
  realSol: number;
  realTokens: number;
  tokenSupply: number;
  graduated: boolean;
  createdAt: number;
  hasVesting: boolean;
  teamPercent: number;
  cliffSeconds: number;
  vestingDuration: number;
  imageUrl?: string;
  uri?: string;
  price?: number;
  marketCap?: number;
  progressPercent?: number;
}

// Fetch and parse Metaplex metadata to get name, symbol, and image URL
async function fetchMetadata(mint: PublicKey): Promise<{ name?: string; symbol?: string; uri?: string; imageUrl?: string }> {
  try {
    // Derive metadata PDA
    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const metadataAccount = await connection.getAccountInfo(metadataPda);
    if (!metadataAccount?.data) {
      console.log('Metadata account not found');
      return {};
    }

    const data = metadataAccount.data;
    
    // Parse Metaplex metadata
    // Structure: key(1) + update_authority(32) + mint(32) + name(4+32) + symbol(4+10) + uri(4+200)
    let offset = 1 + 32 + 32; // key + update_authority + mint
    
    // Read name (4-byte length prefix + content, padded to 32)
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + Math.min(nameLen, 32)).toString('utf8').replace(/\0+$/, '').trim();
    offset += 32; // fixed 32-byte slot
    
    // Read symbol (4-byte length prefix + content, padded to 10)
    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + Math.min(symbolLen, 10)).toString('utf8').replace(/\0+$/, '').trim();
    offset += 10; // fixed 10-byte slot
    
    // Read URI (4-byte length + content, padded to 200)
    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    
    // Extract URI string, trimming null bytes
    const uriBytes = data.slice(offset, offset + Math.min(uriLen, 200));
    const uri = uriBytes.toString('utf8').replace(/\0+$/, '').trim();
    
    console.log('Found metadata - name:', name, 'symbol:', symbol, 'uri:', uri);

    let imageUrl: string | undefined;
    
    // Fetch the JSON metadata to get the image
    if (uri && uri.length > 0) {
      try {
        const response = await fetch(uri);
        if (response.ok) {
          const json = await response.json();
          imageUrl = json.image || json.imageUrl || json.image_url;
          console.log('Found image URL:', imageUrl);
        }
      } catch (fetchErr) {
        console.log('Failed to fetch metadata JSON:', fetchErr);
      }
    }

    return { name, symbol, uri, imageUrl };
  } catch (err) {
    console.error('Error fetching metadata:', err);
    return {};
  }
}

export function useTokenDetails() {
  const fetchTokenInfo = useCallback(async (mint: PublicKey): Promise<TokenDetails | null> => {
    try {
      // Derive curve PDA from mint
      const [curvePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('curve'), mint.toBuffer()],
        PROGRAM_ID
      );

      // Fetch the curve account directly
      const accountInfo = await connection.getAccountInfo(curvePda);
      
      if (!accountInfo || !accountInfo.data) {
        console.log('Curve account not found for mint:', mint.toString());
        return null;
      }

      const data = accountInfo.data;
      
      // Minimum expected size: 8 (discriminator) + 32 + 32 + 8*5 + 1 + 8 + 1 + 1 + 8 + 8 = 139 bytes
      if (data.length < 139) {
        console.log('Curve account data too short:', data.length);
        return null;
      }

      let offset = 8; // Skip discriminator

      // Parse BondingCurve struct according to lib-v4.rs:
      // pub mint: Pubkey,              // 32
      // pub creator: Pubkey,           // 32
      // pub virtual_sol: u64,          // 8
      // pub virtual_tokens: u64,       // 8
      // pub real_sol: u64,             // 8
      // pub real_tokens: u64,          // 8
      // pub token_supply: u64,         // 8
      // pub graduated: bool,           // 1
      // pub created_at: i64,           // 8
      // pub has_vesting: bool,         // 1
      // pub team_percent: u8,          // 1
      // pub cliff_seconds: i64,        // 8
      // pub vesting_duration: i64,     // 8

      // mint (32 bytes)
      const tokenMint = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      // creator (32 bytes)
      const creator = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;

      // virtual_sol (u64) - in lamports, convert to SOL
      const virtualSol = Number(data.readBigUInt64LE(offset)) / 1e9;
      offset += 8;

      // virtual_tokens (u64)
      const virtualTokens = Number(data.readBigUInt64LE(offset));
      offset += 8;

      // real_sol (u64) - in lamports, convert to SOL
      const realSol = Number(data.readBigUInt64LE(offset)) / 1e9;
      offset += 8;

      // real_tokens (u64)
      const realTokens = Number(data.readBigUInt64LE(offset));
      offset += 8;

      // token_supply (u64)
      const tokenSupply = Number(data.readBigUInt64LE(offset));
      offset += 8;

      // graduated (bool)
      const graduated = data[offset] === 1;
      offset += 1;

      // created_at (i64)
      const createdAt = Number(data.readBigInt64LE(offset));
      offset += 8;

      // has_vesting (bool)
      const hasVesting = data[offset] === 1;
      offset += 1;

      // team_percent (u8)
      const teamPercent = data[offset];
      offset += 1;

      // cliff_seconds (i64)
      const cliffSeconds = Number(data.readBigInt64LE(offset));
      offset += 8;

      // vesting_duration (i64)
      const vestingDuration = Number(data.readBigInt64LE(offset));
      offset += 8;

      // Fetch name, symbol, image from Metaplex metadata
      const { name, symbol, uri, imageUrl } = await fetchMetadata(mint);

      // Calculate derived values
      const totalSol = virtualSol + realSol;
      const totalTokens = virtualTokens + realTokens;
      const price = totalTokens > 0 ? totalSol / totalTokens : 0;
      const marketCap = price * 1_000_000_000; // 1B total supply

      // Calculate vesting progress
      const now = Math.floor(Date.now() / 1000);
      let progressPercent = 0;
      if (hasVesting && cliffSeconds > 0) {
        const cliffTime = createdAt + cliffSeconds;
        const endTime = cliffTime + vestingDuration;
        if (now >= endTime) {
          progressPercent = 100;
        } else if (now >= cliffTime) {
          const elapsed = now - cliffTime;
          progressPercent = Math.min(100, Math.floor((elapsed / vestingDuration) * 100));
        }
      }

      return {
        mint: tokenMint,
        creator,
        name: name || 'Unknown',
        symbol: symbol || '???',
        virtualSol,
        virtualTokens,
        realSol,
        realTokens,
        tokenSupply,
        graduated,
        createdAt,
        hasVesting,
        teamPercent,
        cliffSeconds,
        vestingDuration,
        uri,
        imageUrl: imageUrl || `https://picsum.photos/seed/${tokenMint.slice(0, 8)}/120/120`,
        price,
        marketCap,
        progressPercent,
      };
    } catch (error) {
      console.error('Error fetching token details:', error);
      return null;
    }
  }, []);

  return { fetchTokenInfo };
}
