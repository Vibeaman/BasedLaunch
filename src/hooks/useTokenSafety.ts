import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { connection, PROGRAM_ID } from '../lib/anchor';

export interface MintSafety {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  // True when the SPL mint authority has been set to null (no one can mint more).
  mintAuthorityRenounced: boolean;
  // True when the SPL freeze authority is null (no one can freeze holder accounts).
  freezeAuthorityRenounced: boolean;
  // True when the mint authority is the BasedLaunch bonding-curve PDA (expected
  // for a live curve — the program mints tokens as they are bought). This is not
  // a red flag; it just means the token is still on the curve.
  mintAuthorityIsCurve: boolean;
  decimals: number;
  supply: number;
}

// Reads the on-chain SPL mint account to surface rug-relevant authority flags.
export function useTokenSafety() {
  const [safety, setSafety] = useState<MintSafety | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSafety = useCallback(async (mint: PublicKey) => {
    setLoading(true);
    try {
      const info = await connection.getParsedAccountInfo(mint);
      const acc: any = info.value?.data;

      if (acc && typeof acc === 'object' && 'parsed' in acc && acc.parsed?.info) {
        const i = acc.parsed.info;
        const decimals = Number(i.decimals ?? 0);
        const mintAuthority: string | null = i.mintAuthority ?? null;
        const freezeAuthority: string | null = i.freezeAuthority ?? null;

        // Derive the bonding-curve mint-authority PDA to recognise the expected owner.
        const [curveMintAuthority] = PublicKey.findProgramAddressSync(
          [Buffer.from('mint-authority'), mint.toBuffer()],
          PROGRAM_ID
        );

        setSafety({
          mintAuthority,
          freezeAuthority,
          mintAuthorityRenounced: mintAuthority === null,
          freezeAuthorityRenounced: freezeAuthority === null,
          mintAuthorityIsCurve: mintAuthority === curveMintAuthority.toBase58(),
          decimals,
          supply: Number(i.supply ?? 0) / 10 ** decimals,
        });
      } else {
        setSafety(null);
      }
    } catch (err) {
      console.error('Failed to fetch token safety:', err);
      setSafety(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { safety, loading, fetchSafety };
}
