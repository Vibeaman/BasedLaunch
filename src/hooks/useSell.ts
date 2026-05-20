import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { insertTrade, updateTokenState } from '../lib/supabase';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Anchor discriminator for sell
const SELL_DISCRIMINATOR = Buffer.from([0x51, 0x23, 0x0a, 0x6e, 0x93, 0x1e, 0x28, 0x52]);

interface SellParams {
  tokenMint: PublicKey;
  tokenAmount: number;
  minSolOut?: number;
}

export const useSell = () => {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellToken = async (params: SellParams) => {
    const { tokenMint, tokenAmount, minSolOut = 0 } = params;

    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    setError(null);

    try {
      // Derive PDAs
      const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint-authority'), tokenMint.toBuffer()],
        PROGRAM_ID
      );

      const [curve] = PublicKey.findProgramAddressSync(
        [Buffer.from('curve'), tokenMint.toBuffer()],
        PROGRAM_ID
      );

      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('sol-vault'), curve.toBuffer()],
        PROGRAM_ID
      );

      // Get seller's token account
      const sellerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // Build instruction data
      // tokenAmount should already be in base units (no decimals)
      const tokenAmountBigInt = BigInt(Math.floor(tokenAmount));
      const minSolLamports = BigInt(Math.floor(minSolOut * 1e9));

      const data = Buffer.alloc(8 + 8 + 8);
      let offset = 0;

      SELL_DISCRIMINATOR.copy(data, offset);
      offset += 8;

      data.writeBigUInt64LE(tokenAmountBigInt, offset);
      offset += 8;

      data.writeBigUInt64LE(minSolLamports, offset);
      offset += 8;

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },     // seller
          { pubkey: tokenMint, isSigner: false, isWritable: true },            // mint
          { pubkey: mintAuthority, isSigner: false, isWritable: false },       // mint_authority
          { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },   // seller_token_account
          { pubkey: curve, isSigner: false, isWritable: true },                // curve
          { pubkey: solVault, isSigner: false, isWritable: true },             // sol_vault
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data,
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = wallet.publicKey;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

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

      console.log('Sell successful! Signature:', signature);

      // Get updated curve state
      const curveAccount = await connection.getAccountInfo(curve);
      if (curveAccount?.data) {
        const curveData = curveAccount.data;
        let dataOffset = 8 + 32 + 32; // discriminator + creator + mint
        
        // Skip name and symbol
        const nameLen = curveData.readUInt32LE(dataOffset);
        dataOffset += 4 + nameLen;
        const symbolLen = curveData.readUInt32LE(dataOffset);
        dataOffset += 4 + symbolLen;

        const virtualSol = Number(curveData.readBigUInt64LE(dataOffset)) / 1e9;
        dataOffset += 8;
        const virtualTokens = Number(curveData.readBigUInt64LE(dataOffset));
        dataOffset += 8;
        const realSol = Number(curveData.readBigUInt64LE(dataOffset)) / 1e9;
        dataOffset += 8;
        const realTokens = Number(curveData.readBigUInt64LE(dataOffset));

        const totalSol = virtualSol + realSol;
        const totalTokens = virtualTokens - realTokens;
        const newPrice = totalTokens > 0 ? totalSol / totalTokens : 0;
        const marketCap = newPrice * 1_000_000_000;

        // Estimate SOL received
        const solReceived = 0; // Would need to calculate from events or balance diff

        // Insert trade to Supabase
        insertTrade({
          mint: tokenMint.toString(),
          trader: wallet.publicKey.toString(),
          trade_type: 'sell',
          sol_amount: solReceived,
          token_amount: tokenAmount,
          price_at_trade: newPrice,
          tx_signature: signature,
        }).catch(err => console.error('Trade insert failed:', err));

        // Update token state
        updateTokenState(tokenMint.toString(), {
          virtual_sol: virtualSol,
          virtual_tokens: virtualTokens,
          real_sol: realSol,
          real_tokens: realTokens,
          price: newPrice,
          market_cap: marketCap,
        }).catch(err => console.error('Token update failed:', err));
      }

      return { tx: signature };
    } catch (err: any) {
      console.error('Sell error:', err);
      const errorMessage = err.message || 'Failed to sell tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sellToken, loading, error };
};
