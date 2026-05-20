import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, ShieldCheck, ExternalLink, Activity, Clock, Loader2, ArrowLeftRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBuy } from '../hooks/useBuy';
import { useSell } from '../hooks/useSell';
import { useTokenDetails } from '../hooks/useTokenDetails';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

interface ChartDataPoint {
  supplyBought: number; // SOL paid
  price: number;        // Price of token at this supply
  virtualSol: number;   // Total SOL in bonding curve at this point
  virtualTokens: number;// Total Tokens in bonding curve at this point
}

export function TokenDetail() {
  const { mint: mintAddress } = useParams<{ mint: string }>();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const tokenMint = mintAddress ? new PublicKey(mintAddress) : undefined;

  const [activeTab, setActiveTab] = useState('overview');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [tokenDetails, setTokenDetails] = useState<any>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [loadingTrade, setLoadingTrade] = useState(false);
  const [estimation, setEstimation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { fetchTokenInfo } = useTokenDetails();

  useEffect(() => {
    const fetchAndSetTokenDetails = async () => {
      if (!tokenMint) {
        setLoadingToken(false);
        return;
      }
      try {
        setLoadingToken(true);
        const details = await fetchTokenInfo(tokenMint);
        if (details) {
          setTokenDetails(details);
        } else {
          console.log("Token details not found.");
        }
      } catch (error) {
        console.error("Error fetching token details:", error);
      } finally {
        setLoadingToken(false);
      }
    };

    fetchAndSetTokenDetails();
  }, [mintAddress]); // Only re-fetch when mintAddress changes

  // Generate theoretical bonding curve data
  const bondingCurveData = useMemo(() => {
    if (!tokenDetails) return [];

    const { virtualSol, virtualTokens, realSol, realTokens, price: currentPrice } = tokenDetails;
    const k = (virtualSol + realSol) * (virtualTokens - realTokens); // Bonding curve constant: xy = k

    let chartData: ChartDataPoint[] = [];
    let currentSupplyBought = 0; // Represents SOL paid so far

    // Start from initial state (virtualSol, virtualTokens)
    let currentVirtualSol = virtualSol;
    let currentVirtualTokens = virtualTokens;

    // Add initial point (0 SOL paid, initial price)
    chartData.push({
      supplyBought: 0,
      price: currentVirtualTokens > 0 ? currentVirtualSol / currentVirtualTokens : 0,
      virtualSol: currentVirtualSol,
      virtualTokens: currentVirtualTokens,
    });

    // Simulate points along the curve up to a reasonable estimated max supply
    const maxSimulationPoints = 100; // Number of points to plot on the curve
    const simulatedSolIncrease = (realSol * 1.5) / maxSimulationPoints; // Simulate up to 50% more SOL than currently in curve

    for (let i = 1; i <= maxSimulationPoints; i++) {
      currentSupplyBought += simulatedSolIncrease;
      currentVirtualSol = virtualSol + realSol + currentSupplyBought; // Total SOL if this much was paid
      
      // Calculate new virtual tokens: k = newVirtualSol * newVirtualTokens
      // newVirtualTokens = k / newVirtualSol
      if (currentVirtualSol <= 0) continue; // Avoid division by zero
      currentVirtualTokens = k / currentVirtualSol;

      const priceAtPoint = currentVirtualTokens > 0 ? currentVirtualSol / currentVirtualTokens : 0;
      
      // Only add if we have valid token data
      if (currentVirtualTokens > 0) {
        chartData.push({
          supplyBought: currentSupplyBought,
          price: priceAtPoint,
          virtualSol: currentVirtualSol,
          virtualTokens: currentVirtualTokens,
        });
      }
    }
    
    // Add a point for the current actual state
    chartData.push({
      supplyBought: realSol,
      price: currentPrice ?? 0,
      virtualSol: virtualSol + realSol,
      virtualTokens: virtualTokens - realTokens,
    });

    // Ensure data is sorted by supplyBought for charting
    chartData.sort((a, b) => a.supplyBought - b.supplyBought);

    return chartData;
  }, [tokenDetails]);

  // Format tooltip for price
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '--';
    return `$${value.toFixed(9)}`; // Display with more precision for low prices
  };

  const { buyToken } = useBuy();
  const { sellToken } = useSell();

  const handleTrade = async () => {
    if (!connected || !publicKey || !tokenMint || !amount) return;
    setLoadingTrade(true);
    setError(null);
    try {
      if (tradeMode === 'buy') {
        await buyToken({ tokenMint, solAmount: parseFloat(amount) });
      } else {
        await sellToken({ tokenMint, tokenAmount: parseFloat(amount) });
      }
      setAmount('');
      // Refetch token details to update prices
      const details = await fetchTokenInfo(tokenMint);
      if (details) setTokenDetails(details);
    } catch (e: any) {
      console.error(`Trade failed: ${e}`);
      setError(e.message || 'Trade failed');
    } finally {
      setLoadingTrade(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);

    if (!value || isNaN(parseFloat(value)) || !tokenDetails || !bondingCurveData || bondingCurveData.length === 0) {
      setEstimation('');
      return;
    }

    const numericAmount = parseFloat(value);
    
    // Use bonding curve formula: xy = k
    // price = virtualSol / virtualTokens
    const { virtualSol: initialVirtualSol, virtualTokens: initialVirtualTokens, realSol: currentRealSol, realTokens: currentRealTokens } = tokenDetails;
    const k = (initialVirtualSol + currentRealSol) * (initialVirtualTokens - currentRealTokens);
    
    if (tradeMode === 'buy') {
      // Buying: SOL in -> tokens out
      const newVirtualSol = initialVirtualSol + currentRealSol + numericAmount; // Total SOL if this amount was paid
      if (newVirtualSol <= 0) {
        setEstimation('0.00');
        return;
      }
      const newVirtualTokens = k / newVirtualSol;
      const tokensOut = (initialVirtualTokens - currentRealTokens) - newVirtualTokens;
      setEstimation(tokensOut.toLocaleString(undefined, { maximumFractionDigits: 2 }));
    } else {
      // Selling: tokens in -> SOL out
      const newVirtualTokens = initialVirtualTokens - currentRealTokens + numericAmount; // Total tokens if this amount was sold
      if (newVirtualTokens <= 0) {
        setEstimation('0.00');
        return;
      }
      const newVirtualSol = k / newVirtualTokens;
      const solOut = (initialVirtualSol + currentRealSol) - newVirtualSol;
      setEstimation(solOut.toFixed(6));
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold mb-2">About {tokenDetails?.name || 'Token'}</h3>
        <p className="text-gray-400 leading-relaxed">
          {tokenDetails?.name || 'This'} is a token launched on BasedLaunch with a bonding curve and vesting for team tokens.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-gray-500 mb-1">Market Cap</div>
          <div className="font-mono font-medium">${tokenDetails?.marketCap?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '--'}</div>
        </div>
        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-gray-500 mb-1">Current Price</div>
          <div className="font-mono font-medium">{formatCurrency(tokenDetails?.price)}</div>
        </div>
        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-gray-500 mb-1">Launch Date</div>
          <div className="font-mono font-medium">{tokenDetails?.createdAt ? new Date(tokenDetails.createdAt * 1000).toLocaleDateString() : '--'}</div>
        </div>
        <div className="bg-black/30 p-4 rounded-lg border border-white/5">
          <div className="text-xs text-gray-500 mb-1">Progress to Graduation</div>
          <div className="font-mono font-medium">{tokenDetails?.realSol ? ((tokenDetails.realSol / 69) * 100).toFixed(1) : '0'}%</div>
        </div>
      </div>
    </div>
  );

  const renderVesting = () => {
    if (!tokenDetails?.hasVesting) {
      return <div className="text-gray-400 text-center py-8">No vesting schedule for this token.</div>;
    }
    
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4 bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 p-4 rounded-lg">
          <Clock className="w-6 h-6 text-[#8b5cf6]" />
          <div>
            <h4 className="font-bold text-[#8b5cf6]">Vesting Schedule Active</h4>
            <p className="text-sm text-gray-300">Team tokens are locked and unlocking linearly over {tokenDetails?.vestingDurationDays || 0} days (cliff: {tokenDetails?.cliffDays || 0} days).</p>
          </div>
        </div>
        
        <div className="relative pt-8 pb-4">
          <div className="absolute top-0 left-0 w-full h-2 bg-white/10 rounded-full">
            <div className="absolute top-0 left-0 h-full bg-[#8b5cf6] rounded-full" style={{ width: `${tokenDetails?.progressPercent || 0}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>Launch (Day 0)</span>
            <span>Cliff (Day {tokenDetails?.cliffDays || 0})</span>
            <span>Fully Unlocked (Day {(tokenDetails?.vestingDurationDays || 0) + (tokenDetails?.cliffDays || 0)})</span>
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-display font-bold text-white mb-1">{tokenDetails?.progressPercent || 0}%</div>
          <div className="text-sm text-gray-400">Team Tokens Unlocked</div>
        </div>
      </div>
    );
  };

  const renderHolders = () => <div className="text-gray-400 text-center py-8">Holder details coming soon...</div>;
  const renderTransactions = () => <div className="text-gray-400 text-center py-8">Transaction history coming soon...</div>;

  if (loadingToken) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ffd5]" />
        <span className="ml-3 text-gray-400">Loading token details...</span>
      </div>
    );
  }

  if (!tokenDetails) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Token not found or mint address is invalid.</p>
        <button onClick={() => navigate('/explore')} className="mt-4 px-6 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">Go to Explore</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-6">
          <img 
            src={tokenDetails.imageUrl || `https://picsum.photos/seed/${mintAddress?.slice(0, 8)}/120/120`} 
            alt={tokenDetails.name} 
            className="w-20 h-20 rounded-full border-2 border-white/10" 
            referrerPolicy="no-referrer" 
          />
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              {tokenDetails.name} <span className="text-xl text-gray-400 font-normal">${tokenDetails.symbol}</span>
            </h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                <span className="font-mono">{tokenDetails.mint?.slice(0, 4)}...{tokenDetails.mint?.slice(-4)}</span>
                <button onClick={() => navigator.clipboard.writeText(tokenDetails.mint)} className="hover:text-white transition-colors"><Copy className="w-3 h-3" /></button>
              </div>
              {tokenDetails.hasVesting && (
                <div className="flex items-center gap-1 text-sm text-[#8b5cf6] bg-[#8b5cf6]/10 px-3 py-1 rounded-full">
                  <ShieldCheck className="w-4 h-4" /> Vesting Active
                </div>
              )}
              {tokenDetails.graduated && (
                <div className="flex items-center gap-1 text-sm text-[#00ffd5] bg-[#00ffd5]/10 px-3 py-1 rounded-full">
                  Graduated
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4">
          <a href={`https://solscan.io/token/${tokenDetails.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="p-2 glass-card rounded-lg hover:bg-white/10 transition-colors">
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Chart Area */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-3xl font-mono font-bold">{tokenDetails.price ? `$${tokenDetails.price.toFixed(9)}` : '$--'}</div>
                <div className="text-[#00ffd5] text-sm">Bonding Curve Price</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 280, minWidth: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bondingCurveData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ffd5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ffd5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#00ffd5' }}
                    formatter={(value: number) => formatCurrency(value)} // Use formatter for precision
                  />
                  {/* X-axis: represent SOL paid (supply bought) */}
                  <XAxis 
                    dataKey="supplyBought" 
                    type="number" 
                    domain={['auto', 'auto']} 
                    hide 
                    // tickFormatter={(value) => `$${value.toLocaleString()}`} // Format SOL amounts
                  />
                  {/* Y-axis: represent token price */}
                  <YAxis 
                    dataKey="price" 
                    type="number" 
                    domain={['auto', 'auto']} 
                    hide 
                    // tickFormatter={formatCurrency} 
                  />
                  <Area type="monotone" dataKey="price" stroke="#00ffd5" fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center text-xs text-gray-500">
              Showing theoretical bonding curve (Price vs. SOL Bought). Current price: {formatCurrency(tokenDetails.price)}
            </div>
          </div>

          {/* Tabs */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10">
              {['overview', 'vesting', 'holders', 'transactions'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-4 text-sm font-medium capitalize transition-colors",
                    activeTab === tab ? "text-[#00ffd5] border-b-2 border-[#00ffd5] bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="p-6 min-h-[300px]">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'vesting' && renderVesting()}
              {activeTab === 'holders' && renderHolders()}
              {activeTab === 'transactions' && renderTransactions()}
            </div>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl p-6 sticky top-24">
            <div className="flex bg-black/50 rounded-lg p-1 mb-6 border border-white/10">
              <button
                onClick={() => { setTradeMode('buy'); setAmount(''); setEstimation(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                  tradeMode === 'buy' ? "bg-[#00ffd5] text-black" : "text-gray-400 hover:text-white"
                )}
              >
                Buy
              </button>
              <button
                onClick={() => { setTradeMode('sell'); setAmount(''); setEstimation(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-md transition-all",
                  tradeMode === 'sell' ? "bg-[#ff0080] text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Sell
              </button>
            </div>

            <div className="space-y-4">
              {/* Input */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{tradeMode === 'buy' ? 'You pay (in SOL)' : 'You sell (in Tokens)'}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.0"
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-4 pr-16 py-4 text-2xl font-mono text-white focus:outline-none focus:border-[#00ffd5] transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="font-bold">{tradeMode === 'buy' ? 'SOL' : tokenDetails?.symbol || 'TOKEN'}</span>
                  </div>
                </div>
              </div>

              {/* Swap Icon */}
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    setTradeMode(tradeMode === 'buy' ? 'sell' : 'buy');
                    setAmount('');
                    setEstimation('');
                  }} 
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Output */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{tradeMode === 'buy' ? 'You receive (est.)' : 'You receive (est.)'}</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={estimation}
                    placeholder="0.0"
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-4 pr-16 py-4 text-2xl font-mono text-gray-400 cursor-not-allowed"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="font-bold">{tradeMode === 'buy' ? tokenDetails?.symbol || 'TOKEN' : 'SOL'}</span>
                  </div>
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Trade Button */}
              <button
                onClick={handleTrade}
                disabled={loadingTrade || !connected || !amount || !tokenMint}
                className={cn(
                  "w-full py-4 rounded-lg font-bold text-lg mt-4 transition-all",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{
                  background: tradeMode === 'buy' ? 'linear-gradient(to right, #00ffd5, #00d4cc)' : 'linear-gradient(to right, #ff0080, #e00070)',
                  color: tradeMode === 'buy' ? '#000' : '#fff',
                }}
              >
                {loadingTrade ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Processing...
                  </div>
                ) : !connected ? 'Connect Wallet' : (tradeMode === 'buy' ? 'Buy' : 'Sell')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
