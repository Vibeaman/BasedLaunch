import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { insertTrade, updateTokenState } from '../lib/supabase';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Anchor discriminator for buy
const BUY_DISCRIMINATOR = Buffer.from([0x66, 0x06, 0x3d, 0x12, 0x01, 0xda, 0xeb, 0xea]);

interface BuyParams {
  tokenMint: PublicKey;
  solAmount: number;
  minTokensOut?: number;
}

export const useBuy = () => {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyToken = async (params: BuyParams) => {
    const { tokenMint, solAmount, minTokensOut = 0 } = params;

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

      // Get or create buyer's token account
      const buyerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet.publicKey
      );

      // Build instruction data
      const solLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
      const minTokens = BigInt(Math.floor(minTokensOut));

      const data = Buffer.alloc(8 + 8 + 8);
      let offset = 0;

      BUY_DISCRIMINATOR.copy(data, offset);
      offset += 8;

      data.writeBigUInt64LE(solLamports, offset);
      offset += 8;

      data.writeBigUInt64LE(minTokens, offset);
      offset += 8;

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },    // buyer
          { pubkey: tokenMint, isSigner: false, isWritable: true },           // mint
          { pubkey: mintAuthority, isSigner: false, isWritable: false },      // mint_authority
          { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },   // buyer_token_account
          { pubkey: curve, isSigner: false, isWritable: true },               // curve
          { pubkey: solVault, isSigner: false, isWritable: true },            // sol_vault
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
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

      console.log('Buy successful! Signature:', signature);

      // Get updated curve state to calculate tokens received and new price
      const curveAccount = await connection.getAccountInfo(curve);
      if (curveAccount?.data) {
        const curveData = curveAccount.data;
        let dataOffset = 8 + 32 + 32; // discriminator + creator + mint
        
        // Skip name and symbol (variable length strings)
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

        // Estimate tokens received (rough calculation)
        const k = (virtualSol + realSol - solAmount) * (virtualTokens - realTokens + 0);
        const tokensReceived = realTokens; // This is cumulative, need better tracking

        // Insert trade to Supabase
        insertTrade({
          mint: tokenMint.toString(),
          trader: wallet.publicKey.toString(),
          trade_type: 'buy',
          sol_amount: solAmount,
          token_amount: tokensReceived, // Approximate
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
      console.error('Buy error:', err);
      const errorMessage = err.message || 'Failed to buy tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { buyToken, loading, error };
};
