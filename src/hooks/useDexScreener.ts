import { useState, useEffect } from 'react';

interface DexToken {
  address: string;
  name: string;
  symbol: string;
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
  pairAddress: string;
  dexId: string;
  url: string;
  imageUrl: string;
}

// Map a DexScreener pair object to our DexToken shape
const mapPair = (pair: any, iconOverride?: string): DexToken => ({
  address: pair.baseToken.address,
  name: pair.baseToken.name,
  symbol: pair.baseToken.symbol,
  priceUsd: pair.priceUsd || '0',
  priceChange24h: pair.priceChange?.h24 || 0,
  volume24h: pair.volume?.h24 || 0,
  liquidity: pair.liquidity?.usd || 0,
  fdv: pair.fdv || 0,
  marketCap: pair.marketCap || pair.fdv || 0,
  pairAddress: pair.pairAddress,
  dexId: pair.dexId,
  url: pair.url,
  imageUrl: iconOverride || pair.info?.imageUrl || '',
});

// Fetch details for multiple token addresses in one batched call
const fetchTokenDetailsBatch = async (
  addresses: string[],
  iconMap?: Record<string, string>
): Promise<DexToken[]> => {
  if (addresses.length === 0) return [];

  try {
    const joined = addresses.join(',');
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${joined}`
    );
    const data = await res.json();

    if (!data.pairs) return [];

    // Group by base token address; keep only the first (highest-liquidity) pair per token
    const seen = new Set<string>();
    const tokens: DexToken[] = [];

    for (const pair of data.pairs) {
      const addr = pair.baseToken?.address;
      if (!addr || seen.has(addr)) continue;
      seen.add(addr);
      tokens.push(mapPair(pair, iconMap?.[addr]));
    }

    return tokens;
  } catch (err) {
    console.error('Batch token fetch failed:', err);
    return [];
  }
};

export const useDexScreener = () => {
  const [trending, setTrending] = useState<DexToken[]>([]);
  const [newPairs, setNewPairs] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrending = async () => {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/token-boosts/top/v1'
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const solanaTokens = data
          .filter((item: any) => item.chainId === 'solana')
          .slice(0, 15);

        const addresses = solanaTokens.map((t: any) => t.tokenAddress);
        const tokens = await fetchTokenDetailsBatch(addresses);
        setTrending(tokens);
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      // Fallback: search for popular Solana tokens
      try {
        const fallbackRes = await fetch(
          'https://api.dexscreener.com/latest/dex/search?q=SOL'
        );
        const fallbackData = await fallbackRes.json();
        if (fallbackData.pairs) {
          const tokens: DexToken[] = fallbackData.pairs
            .filter((pair: any) => pair.chainId === 'solana')
            .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
            .slice(0, 10)
            .map((pair: any) => mapPair(pair));
          setTrending(tokens);
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  const fetchNewPairs = async () => {
    try {
      const response = await fetch(
        'https://api.dexscreener.com/token-profiles/latest/v1'
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const solanaTokens = data
          .filter((item: any) => item.chainId === 'solana')
          .slice(0, 15);

        const addresses = solanaTokens.map((t: any) => t.tokenAddress);
        // Build an icon map so we can prefer the profile icon over pair info
        const iconMap: Record<string, string> = {};
        for (const item of solanaTokens) {
          if (item.icon) iconMap[item.tokenAddress] = item.icon;
        }

        const tokens = await fetchTokenDetailsBatch(addresses, iconMap);
        setNewPairs(tokens);
      } else {
        // Fallback to search
        const fallbackRes = await fetch(
          'https://api.dexscreener.com/latest/dex/search?q=launched'
        );
        const fallbackData = await fallbackRes.json();
        if (fallbackData.pairs) {
          const tokens: DexToken[] = fallbackData.pairs
            .filter((pair: any) => pair.chainId === 'solana')
            .sort((a: any, b: any) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0))
            .slice(0, 10)
            .map((pair: any) => mapPair(pair));
          setNewPairs(tokens);
        }
      }
    } catch (err) {
      console.error('Failed to fetch new pairs:', err);
    }
  };

  const searchToken = async (query: string): Promise<DexToken[]> => {
    try {
      // Check if query looks like a contract address (base58, 32-44 chars)
      const isCA = query.length >= 32 && query.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(query);

      let response;
      if (isCA) {
        response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${query}`
        );
      } else {
        response = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );
      }

      const data = await response.json();

      if (data.pairs) {
        return data.pairs
          .filter((pair: any) => pair.chainId === 'solana')
          .slice(0, 20)
          .map((pair: any) => mapPair(pair));
      }
      return [];
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  };

  const getTokenByAddress = async (address: string): Promise<DexToken | null> => {
    try {
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`
      );
      const data = await response.json();

      if (data.pairs && data.pairs.length > 0) {
        return mapPair(data.pairs[0]);
      }
      return null;
    } catch (err) {
      console.error('Failed to get token:', err);
      return null;
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTrending(), fetchNewPairs()]);
      setLoading(false);
    };
    load();

    // Refresh every 60 seconds
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    trending,
    newPairs,
    loading,
    error,
    searchToken,
    getTokenByAddress,
    refresh: () => Promise.all([fetchTrending(), fetchNewPairs()]),
  };
};
