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

export const useDexScreener = () => {
  const [trending, setTrending] = useState<DexToken[]>([]);
  const [newPairs, setNewPairs] = useState<DexToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrending = async () => {
    try {
      // Use token boosted endpoint for trending tokens
      const response = await fetch(
        'https://api.dexscreener.com/token-boosts/top/v1'
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const solanaTokens = data
          .filter((item: any) => item.chainId === 'solana')
          .slice(0, 15);
        
        // Fetch details for each token
        const tokenDetails: DexToken[] = [];
        for (const item of solanaTokens) {
          try {
            const detailRes = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${item.tokenAddress}`
            );
            const detailData = await detailRes.json();
            if (detailData.pairs && detailData.pairs.length > 0) {
              const pair = detailData.pairs[0];
              tokenDetails.push({
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
                imageUrl: pair.info?.imageUrl || '',
              });
            }
          } catch (e) {
            // Skip failed tokens
          }
        }
        setTrending(tokenDetails);
      }
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      // Fallback: try search for popular Solana tokens
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
            .map((pair: any) => ({
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
              imageUrl: pair.info?.imageUrl || '',
            }));
          setTrending(tokens);
        }
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  const fetchNewPairs = async () => {
    try {
      // Get latest Solana token profiles (new launches)
      const response = await fetch(
        'https://api.dexscreener.com/token-profiles/latest/v1'
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const solanaTokens = data
          .filter((item: any) => item.chainId === 'solana')
          .slice(0, 15);
        
        const tokenDetails: DexToken[] = [];
        for (const item of solanaTokens) {
          try {
            const detailRes = await fetch(
              `https://api.dexscreener.com/latest/dex/tokens/${item.tokenAddress}`
            );
            const detailData = await detailRes.json();
            if (detailData.pairs && detailData.pairs.length > 0) {
              const pair = detailData.pairs[0];
              tokenDetails.push({
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
                imageUrl: item.icon || pair.info?.imageUrl || '',
              });
            }
          } catch (e) {
            // Skip failed tokens
          }
        }
        setNewPairs(tokenDetails);
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
            .map((pair: any) => ({
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
              imageUrl: pair.info?.imageUrl || '',
            }));
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
        // Direct token lookup for CA
        response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${query}`
        );
      } else {
        // Search by name/symbol
        response = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
        );
      }
      
      const data = await response.json();
      
      if (data.pairs) {
        return data.pairs
          .filter((pair: any) => pair.chainId === 'solana')
          .slice(0, 20)
          .map((pair: any) => ({
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
            imageUrl: pair.info?.imageUrl || '',
          }));
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
        const pair = data.pairs[0];
        return {
          address: pair.baseToken.address,
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          priceUsd: pair.priceUsd || '0',
          priceChange24h: pair.priceChange?.h24 || 0,
          volume24h: pair.volume?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          fdv: pair.fdv || 0,
          pairAddress: pair.pairAddress,
          dexId: pair.dexId,
          url: pair.url,
        };
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

    // Refresh every 60 seconds (to avoid rate limits)
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
