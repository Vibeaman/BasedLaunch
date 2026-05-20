import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Connection, PublicKey } from '@solana/web3.js';
import { useDexScreener } from '../hooks/useDexScreener';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

interface BasedToken {
  mint: string;
  name: string;
  symbol: string;
  realSol: number;
  graduated: boolean;
  hasVesting: boolean;
  teamPercent: number;
  createdAt: number;
  price: string;
  mc: string;
  progress: number;
  image: string;
}

const TABS = ['Trending', 'New', 'Graduated', 'Has Vesting', 'Rev Share'];

export function Explore() {
  const [activeTab, setActiveTab] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [basedTokens, setBasedTokens] = useState<BasedToken[]>([]);
  const [loadingBased, setLoadingBased] = useState(true);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // DexScreener data for Trending and New tabs
  const { trending, newPairs, loading: loadingDex, searchToken } = useDexScreener();

  useEffect(() => {
    loadBasedTokens();
  }, []);

  const loadBasedTokens = async () => {
    setLoadingBased(true);
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID);
      const parsedTokens: BasedToken[] = [];

      for (const account of accounts) {
        try {
          const data = account.account.data;
          if (data.length < 100) continue;
          
          let offset = 8;
          offset += 32; // creator
          const mint = new PublicKey(data.slice(offset, offset + 32)).toString();
          offset += 32;

          const nameLen = data.readUInt32LE(offset);
          offset += 4;
          const name = data.slice(offset, offset + nameLen).toString('utf8');
          offset += nameLen;

          const symbolLen = data.readUInt32LE(offset);
          offset += 4;
          const symbol = data.slice(offset, offset + symbolLen).toString('utf8');
          offset += symbolLen;

          offset += 8; // virtual_sol
          offset += 8; // virtual_tokens
          const realSol = Number(data.readBigUInt64LE(offset)) / 1e9;
          offset += 8;
          offset += 8; // real_tokens
          const graduated = data[offset] === 1;
          offset += 1;
          const createdAt = Number(data.readBigInt64LE(offset));
          offset += 8;
          const hasVesting = data[offset] === 1;
          offset += 1;
          const teamPercent = data[offset];

          const progress = Math.min((realSol / 69) * 100, 100);
          const estimatedPrice = realSol > 0 ? (realSol / 1000000000 * 1000).toFixed(6) : '0.000001';

          parsedTokens.push({
            mint,
            name,
            symbol,
            realSol,
            graduated,
            hasVesting,
            teamPercent,
            createdAt,
            price: `$${estimatedPrice}`,
            mc: `$${(realSol * 150).toFixed(0)}`,
            progress: Math.floor(progress),
            image: `https://picsum.photos/seed/${mint.slice(0, 8)}/100/100`,
          });
        } catch (err) {
          // Skip malformed
        }
      }

      setBasedTokens(parsedTokens.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoadingBased(false);
    }
  };

  // Filter BasedLaunch tokens based on tab
  const filteredBasedTokens = basedTokens.filter(token => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!token.name.toLowerCase().includes(query) && !token.symbol.toLowerCase().includes(query)) {
        return false;
      }
    }

    switch (activeTab) {
      case 'Graduated':
        return token.graduated;
      case 'Has Vesting':
        return token.hasVesting;
      case 'Rev Share':
        return token.teamPercent > 0; // Assuming revShare is stored in teamPercent for now
      default:
        return true;
    }
  });

  // Handle search with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If query is long enough (could be CA or name), search DexScreener
    if (query.length >= 3) {
      const timeout = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await searchToken(query);
          setSearchResults(results);
        } catch (err) {
          console.error('Search failed:', err);
        } finally {
          setIsSearching(false);
        }
      }, 500); // 500ms debounce
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  };

  // Filter DexScreener tokens by search (for local filtering)
  const filteredTrending = trending.filter(token => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return token.name.toLowerCase().includes(query) || token.symbol.toLowerCase().includes(query);
  });

  const filteredNewPairs = newPairs.filter(token => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return token.name.toLowerCase().includes(query) || token.symbol.toLowerCase().includes(query);
  });

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Check if we should show DexScreener data (Trending/New) or BasedLaunch data
  const showDexScreener = activeTab === 'Trending' || activeTab === 'New';
  const isLoading = showDexScreener ? loadingDex : loadingBased;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-display font-black mb-4 tracking-tighter">EXPLORE</h1>
          <p className="text-gray-400 text-lg">Discover the next big thing, safely.</p>
        </div>
        
        <div className="w-full md:w-auto relative">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, ticker, or paste CA..."
            className="w-full md:w-80 bg-transparent border-b border-white/20 pl-8 pr-4 py-3 text-white focus:outline-none focus:border-[#00ffd5] transition-colors rounded-none"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Searching...</div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.length >= 3 && searchResults.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#00ffd5] mb-4">Search Results</h3>
          <div className="flex flex-col gap-2">
            {searchResults.map((token, i) => (
              <a 
                key={token.pairAddress} 
                href={token.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 bg-[#00ffd5]/5 border border-[#00ffd5]/20 hover:border-[#00ffd5]/50 hover:bg-[#00ffd5]/10 transition-all group"
                >
                  <div className="col-span-1 md:col-span-3 flex items-center gap-4">
                    {token.imageUrl ? (
                      <img src={token.imageUrl} alt={token.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ffd5] to-blue-500 flex items-center justify-center text-black font-bold">
                        {token.symbol[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold font-display">{token.name}</h3>
                      <span className="text-sm text-gray-500 font-mono">${token.symbol}</span>
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2 font-mono">${parseFloat(token.priceUsd).toFixed(6)}</div>
                  <div className="col-span-1 md:col-span-2 font-mono">{formatNumber(token.marketCap || token.fdv)}</div>
                  <div className={cn("col-span-1 md:col-span-2 font-mono", token.priceChange24h >= 0 ? "text-[#00ffd5]" : "text-red-400")}>
                    {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h?.toFixed(2) || 0}%
                  </div>
                  <div className="col-span-1 md:col-span-2 font-mono">{formatNumber(token.volume24h)}</div>
                  <div className="col-span-1 md:col-span-1 font-mono text-sm">{formatNumber(token.liquidity)}</div>
                </motion.div>
              </a>
            ))}
          </div>
          <div className="border-b border-white/10 mt-8 mb-4"></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-12 gap-8 border-b border-white/10 no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 whitespace-nowrap text-sm font-bold uppercase tracking-widest transition-all relative",
              activeTab === tab
                ? "text-[#00ffd5]"
                : "text-gray-500 hover:text-white"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffd5]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading tokens...</div>
      ) : showDexScreener ? (
        /* DexScreener Tokens (Trending / New) */
        <>
          {(activeTab === 'Trending' ? filteredTrending : filteredNewPairs).length === 0 ? (
            <div className="text-center py-20 text-gray-400">No tokens found</div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                <div className="col-span-3">Token</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Market Cap</div>
                <div className="col-span-2">24h Change</div>
                <div className="col-span-2">Volume</div>
                <div className="col-span-1">Liq</div>
              </div>

              {(activeTab === 'Trending' ? filteredTrending : filteredNewPairs).map((token, i) => (
                <a 
                  key={token.pairAddress} 
                  href={token.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-5 bg-transparent border border-white/5 hover:border-[#00ffd5]/30 hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="col-span-1 md:col-span-3 flex items-center gap-4">
                      {token.imageUrl ? (
                        <img 
                          src={token.imageUrl} 
                          alt={token.name} 
                          className="w-12 h-12 rounded-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg ${token.imageUrl ? 'hidden' : ''}`}>
                        {token.symbol[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg font-display">{token.name}</h3>
                        </div>
                        <span className="text-sm text-gray-500 font-mono">${token.symbol}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Price</span>
                      <div className="font-mono">${parseFloat(token.priceUsd).toFixed(6)}</div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Market Cap</span>
                      <div className="font-mono">{formatNumber(token.marketCap || token.fdv)}</div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">24h Change</span>
                      <div className={cn("font-mono", token.priceChange24h >= 0 ? "text-[#00ffd5]" : "text-red-400")}>
                        {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Volume</span>
                      <div className="font-mono">{formatNumber(token.volume24h)}</div>
                    </div>

                    <div className="col-span-1 md:col-span-1 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Liq</span>
                      <div className="font-mono text-sm">{formatNumber(token.liquidity)}</div>
                    </div>
                  </motion.div>
                </a>
              ))}
            </div>
          )}
          <div className="text-center text-gray-600 text-xs mt-8">
            Data from DexScreener - Solana Mainnet
          </div>
        </>
      ) : (
        /* BasedLaunch Tokens (Graduated / Has Vesting / Rev Share) */
        <>
          {filteredBasedTokens.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">No tokens found matching your criteria.</div>
              <Link to="/launch" className="text-[#00ffd5] hover:underline">
                Be the first to launch!
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                <div className="col-span-4">Token</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-2">Market Cap</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Bonding Curve</div>
              </div>

              {filteredBasedTokens.map((token, i) => (
                <Link key={token.mint} to={`/token/${token.mint}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-5 bg-transparent border border-white/5 hover:border-[#00ffd5]/30 hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="col-span-1 md:col-span-4 flex items-center gap-4">
                      <img src={token.image} alt={token.name} className="w-12 h-12 rounded-full grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg font-display">{token.name}</h3>
                          {token.hasVesting && (
                            <ShieldCheck className="w-4 h-4 text-[#00ffd5]" />
                          )}
                        </div>
                        <span className="text-sm text-gray-500 font-mono">${token.symbol}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Price</span>
                      <div className="font-mono">{token.price}</div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Market Cap</span>
                      <div className="font-mono">{token.mc}</div>
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-between md:block">
                      <span className="md:hidden text-xs text-gray-500 uppercase">Status</span>
                      <div className={cn("font-mono", token.graduated ? "text-[#00ffd5]" : "text-yellow-400")}>
                        {token.graduated ? 'Graduated' : 'Active'}
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <div className="flex justify-between text-xs mb-2 md:hidden">
                        <span className="text-gray-500 uppercase">Bonding Curve</span>
                        <span className="text-[#00ffd5]">{token.progress}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-grow h-1 bg-white/10 rounded-none overflow-hidden">
                          <div 
                            className="h-full bg-[#00ffd5]" 
                            style={{ width: `${token.progress}%` }}
                          />
                        </div>
                        <span className="hidden md:block text-xs text-[#00ffd5] font-mono w-8 text-right">{token.progress}%</span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center text-gray-600 text-xs mt-8">
            BasedLaunch Tokens - Solana Devnet
          </div>
        </>
      )}
    </div>
  );
}
