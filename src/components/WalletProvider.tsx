import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

export function WalletProvider({ children }: { children: React.ReactNode }) {
    // Use custom RPC if set, otherwise fall back to mainnet public endpoint.
    const endpoint = useMemo(
        () => import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        []
    );

    // Wallet Standard auto-detects all installed wallets (Phantom, Solflare,
    // Backpack, etc.) — no manual adapter list needed.
    const wallets = useMemo(() => [], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    );
}
