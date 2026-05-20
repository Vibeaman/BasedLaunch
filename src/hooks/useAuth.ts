import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { User, getOrCreateUser } from '@/lib/supabase';
export function useAuth() {
  const { publicKey, connected, disconnect } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function handleConnect() {
      if (connected && publicKey) {
        setLoading(true);
        const walletAddress = publicKey.toBase58();
        const dbUser = await getOrCreateUser(walletAddress);
        setUser(dbUser);
        setLoading(false);
      } else {
        setUser(null);
      }
    }

    handleConnect();
  }, [connected, publicKey]);

  const signOut = () => {
    disconnect();
    setUser(null);
  };

  return {
    user,
    loading,
    connected,
    walletAddress: publicKey?.toBase58() || null,
    signOut,
  };
}
