import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  Transaction, 
  TransactionInstruction 
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { insertToken } from '../lib/supabase';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const FEE_WALLET = new PublicKey('HpoDxdfvC6PSeupnhH1YXbuiQT4zkot3pCetQim7x5Mj');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Anchor discriminator for create_token
const CREATE_TOKEN_DISCRIMINATOR = Buffer.from([0x54, 0x34, 0xcc, 0xe4, 0x18, 0x8c, 0xea, 0x4b]);

interface CreateTokenParams {
  name: string;
  symbol: string;
  metadataUri?: string;
  imageUrl?: string; // Direct image URL for supabase
  teamPercent?: number;
  cliffDays?: number;
  vestingDays?: number;
  whitelistDurationDays?: number;
}

export const useCreateToken = () => {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createToken = async (params: CreateTokenParams) => {
    const {
      name,
      symbol,
      metadataUri = '',
      imageUrl = '',
      teamPercent = 0,
      cliffDays = 0,
      vestingDays = 0,
      whitelistDurationDays = 0,
    } = params;

    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      const mint = Keypair.generate();

      // Derive PDAs
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint-authority'), mint.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [curve] = PublicKey.findProgramAddressSync(
        [Buffer.from('curve'), mint.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [vestingVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('vesting-vault'), mint.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // FIXED: sol_vault uses mint, not curve
      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol-vault'), mint.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Metadata PDA (Metaplex)
      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.publicKey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      );

      // Build instruction data
      const nameBytes = Buffer.from(name, 'utf8');
      const symbolBytes = Buffer.from(symbol, 'utf8');
      const uriBytes = Buffer.from(metadataUri || '', 'utf8');

      const hasVesting = teamPercent > 0;
      const cliffSeconds = BigInt(cliffDays * 24 * 60 * 60);
      const vestingDurationSeconds = BigInt(vestingDays * 24 * 60 * 60);
      const whitelistDurationSeconds = BigInt(whitelistDurationDays * 24 * 60 * 60);

      const dataSize = 8 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 1 + 8 + 8 + 1 + 8;
      const data = Buffer.alloc(dataSize);
      let offset = 0;

      CREATE_TOKEN_DISCRIMINATOR.copy(data, offset);
      offset += 8;

      data.writeUInt32LE(nameBytes.length, offset);
      offset += 4;
      nameBytes.copy(data, offset);
      offset += nameBytes.length;

      data.writeUInt32LE(symbolBytes.length, offset);
      offset += 4;
      symbolBytes.copy(data, offset);
      offset += symbolBytes.length;

      data.writeUInt32LE(uriBytes.length, offset);
      offset += 4;
      uriBytes.copy(data, offset);
      offset += uriBytes.length;

      data.writeUInt8(hasVesting ? 1 : 0, offset);
      offset += 1;

      data.writeBigInt64LE(cliffSeconds, offset);
      offset += 8;

      data.writeBigInt64LE(vestingDurationSeconds, offset);
      offset += 8;

      data.writeUInt8(teamPercent, offset);
      offset += 1;

      data.writeBigInt64LE(whitelistDurationSeconds, offset);
      offset += 8;

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: mint.publicKey, isSigner: true, isWritable: true },
          { pubkey: mintAuthority, isSigner: false, isWritable: false },
          { pubkey: metadata, isSigner: false, isWritable: true },
          { pubkey: vestingVault, isSigner: false, isWritable: true },
          { pubkey: curve, isSigner: false, isWritable: true },
          { pubkey: solVault, isSigner: false, isWritable: true },
          { pubkey: FEE_WALLET, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = wallet.publicKey;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      transaction.partialSign(mint);
      const signedTx = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      console.log('Token created! Signature:', signature);
      console.log('Mint address:', mint.publicKey.toString());

      // Insert token to Supabase (non-blocking)
      insertToken({
        mint: mint.publicKey.toString(),
        creator: wallet.publicKey.toString(),
        name,
        symbol,
        image_url: imageUrl,
        metadata_uri: metadataUri,
        virtual_sol: 30, // Initial bonding curve values
        virtual_tokens: 1_000_000_000,
        real_sol: 0,
        real_tokens: 0,
        price: 0.00000003, // 30 / 1B
        market_cap: 30, // Initial virtual SOL
        has_vesting: hasVesting,
        team_percent: teamPercent,
        cliff_days: cliffDays,
        vesting_days: vestingDays,
        graduated: false,
      }).catch(err => console.error('Supabase insert failed:', err));

      return {
        tx: signature,
        mint: mint.publicKey.toString(),
      };
    } catch (err: any) {
      console.error('Create token error:', err);
      const errorMessage = err.message || 'Failed to create token';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createToken, loading, error };
};
