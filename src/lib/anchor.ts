import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
export const FEE_WALLET = new PublicKey('HpoDxdfvC6PSeupnhH1YXbuiQT4zkot3pCetQim7x5Mj');

export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

export const getProvider = (wallet: any) => {
  return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
};
