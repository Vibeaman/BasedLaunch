import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
export const FEE_WALLET = new PublicKey('HpoDxdfvC6PSeupnhH1YXbuiQT4zkot3pCetQim7x5Mj');

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet');
export const connection = new Connection(RPC_URL, 'confirmed');

export const getProvider = (wallet: any) => {
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
};
