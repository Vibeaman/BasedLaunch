import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Settings, Coins, Send, Activity, Rocket, Plus, Copy, Check, Edit2, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

interface MyToken {
  mint: string;
  name: string;
  symbol: string;
  realSol: number;
  graduated: boolean;
  hasVesting: boolean;
  teamPercent: number;
  progress: number;
  createdAt: number;
}

export function Dashboard() {
  const { connected, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('my-tokens');
  const [myTokens, setMyTokens] = useState<MyToken[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('DegenCreator');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadMyTokens();
    }
  }, [connected, publicKey]);

  const loadMyTokens = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID);
      const tokens: MyToken[] = [];

      for (const account of accounts) {
        try {
          const data = account.account.data;
          if (data.length < 100) continue;
          
          let offset = 8; // discriminator
          
          // Read creator (32 bytes)
          const creator = new PublicKey(data.slice(offset, offset + 32));
          offset += 32;
          
          // Check if this token was created by the connected wallet
          if (!creator.equals(publicKey)) continue;
          
          // Read mint
          const mint = new PublicKey(data.slice(offset, offset + 32)).toString();
          offset += 32;

          // Read name
          const nameLen = data.readUInt32LE(offset);
          offset += 4;
          const name = data.slice(offset, offset + nameLen).toString('utf8');
          offset += nameLen;

          // Read symbol
          const symbolLen = data.readUInt32LE(offset);
          offset += 4;
          const symbol = data.slice(offset, offset + symbolLen).toString('utf8');
          offset += symbolLen;

          // Skip virtual_sol and virtual_tokens
          offset += 8;
          offset += 8;
          
          // Read real_sol
          const realSol = Number(data.readBigUInt64LE(offset)) / 1e9;
          offset += 8;
          
          // Skip real_tokens
          offset += 8;
          
          // Read graduated
          const graduated = data[offset] === 1;
          offset += 1;
          
          // Read created_at
          const createdAt = Number(data.readBigInt64LE(offset));
          offset += 8;
          
          // Read has_vesting
          const hasVesting = data[offset] === 1;
          offset += 1;
          
          // Skip team_amount, released_amount, cliff_time, end_time
          offset += 8;
          offset += 8;
          offset += 8;
          offset += 8;
          
          // Read team_percent
          const teamPercent = data[offset];

          const progress = Math.min((realSol / 69) * 100, 100);

          tokens.push({
            mint,
            name,
            symbol,
            realSol,
            graduated,
            hasVesting,
            teamPercent,
            progress: Math.floor(progress),
            createdAt,
          });
        } catch (err) {
          // Skip malformed accounts
        }
      }

      setMyTokens(tokens.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const totalVolume = myTokens.reduce((acc, t) => acc + t.realSol, 0);

  if (!connected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-32 min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Settings className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">Connect Wallet to View Dashboard</h1>
        <p className="text-gray-400 mb-8 max-w-md">
          Manage your launched tokens, distribute airdrops, and view revenue sharing statistics.
        </p>
        <div className="wallet-btn-wrapper glow-primary rounded-lg">
          <WalletMultiButton className="!bg-[#00ffd5]/10 !text-[#00ffd5] hover:!bg-[#00ffd5]/20 !transition-all !border !border-[#00ffd5]/50 !rounded-lg !font-sans !font-semibold" />
        </div>
      </div>
    );
  }

  const renderProfileSection = () => (
    <div className="bg-white/[0.02] border border-white/10 p-8 mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 bg-black border border-white/20 p-1 shrink-0">
          <img 
            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${publicKey?.toBase58() || 'default'}&backgroundColor=0a0a0f`} 
            alt="Avatar" 
            className="w-full h-full"
          />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-transparent border-b border-[#00ffd5] text-2xl font-display font-bold focus:outline-none text-white w-48"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                />
                <button onClick={() => setIsEditingName(false)} className="text-[#00ffd5] hover:text-white transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h2 className="text-3xl font-display font-bold">{displayName}</h2>
                <button onClick={() => setIsEditingName(true)} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#00ffd5]">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400 font-mono">
            <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 border border-white/5">
              <span>{truncateAddress(publicKey?.toBase58() || '')}</span>
              <button onClick={handleCopy} className="hover:text-[#00ffd5] transition-colors">
                {copied ? <Check className="w-4 h-4 text-[#00ffd5]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-8 w-full md:w-auto border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Tokens Launched</div>
          <div className="text-3xl font-mono font-bold text-[#00ffd5]">{myTokens.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Total Liquidity</div>
          <div className="text-3xl font-mono font-bold text-white">{totalVolume.toFixed(2)} SOL</div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
        <div className="mb-10">
          <h1 className="text-5xl md:text-7xl font-display font-black mb-2 tracking-tighter">DASHBOARD</h1>
          <p className="text-gray-400 text-lg">Manage your tokens and community.</p>
        </div>
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading your tokens...
        </div>
      </div>
    );
  }

  if (myTokens.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
        <div className="mb-10">
          <h1 className="text-5xl md:text-7xl font-display font-black mb-2 tracking-tighter">DASHBOARD</h1>
          <p className="text-gray-400 text-lg">Manage your tokens and community.</p>
        </div>

        {renderProfileSection()}
        
        <div className="bg-transparent border border-white/10 p-12 md:p-20 flex flex-col items-center justify-center text-center min-h-[40vh]">
          <div className="w-24 h-24 rounded-none bg-white/[0.02] border border-white/10 flex items-center justify-center mb-8">
            <Rocket className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">You haven't launched any tokens yet.</h2>
          <p className="text-gray-400 mb-8 max-w-md text-lg">
            Create your first token with built-in trust mechanics and start building your community.
          </p>
          <Link
            to="/launch"
            className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold text-black bg-[#00ffd5] rounded-none hover:bg-[#00ffd5]/90 transition-all uppercase tracking-widest border border-[#00ffd5] glow-primary"
          >
            Launch Token
            <Plus className="ml-3 w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-display font-black mb-2 tracking-tighter">DASHBOARD</h1>
        <p className="text-gray-400 text-lg">Manage your tokens and community.</p>
      </div>

      {renderProfileSection()}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-transparent border border-white/10 p-4 space-y-2">
            {[
              { id: 'my-tokens', label: 'My Tokens', icon: <Coins className="w-5 h-5" /> },
              { id: 'airdrop', label: 'Airdrop Tool', icon: <Send className="w-5 h-5" /> },
              { id: 'rev-share', label: 'Revenue Share', icon: <Activity className="w-5 h-5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-4 font-bold uppercase tracking-widest text-sm transition-colors text-left border-b",
                  activeTab === tab.id
                    ? "text-[#00ffd5] border-[#00ffd5]"
                    : "text-gray-500 hover:text-white border-transparent hover:border-white/30"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-transparent border border-white/10 p-8 md:p-12 min-h-[500px]">
            {activeTab === 'my-tokens' && (
              <div>
                <h2 className="text-3xl font-display font-black mb-8 tracking-tighter">MY LAUNCHED TOKENS</h2>
                <div className="space-y-6">
                  {myTokens.map((token) => (
                    <Link key={token.mint} to={`/token/${token.mint}`}>
                      <div className="bg-white/[0.02] border border-white/10 p-8 hover:border-[#00ffd5]/30 transition-all">
                        <div className="flex justify-between items-start mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#00ffd5] to-blue-500 flex items-center justify-center text-black font-bold text-2xl">
                              {token.symbol[0]}
                            </div>
                            <div>
                              <h3 className="font-bold text-2xl font-display">{token.name}</h3>
                              <span className="text-sm text-gray-500 font-mono">${token.symbol}</span>
                            </div>
                          </div>
                          <div className={cn(
                            "px-4 py-2 text-xs font-bold uppercase tracking-widest",
                            token.graduated 
                              ? "bg-[#00ffd5]/10 text-[#00ffd5] border border-[#00ffd5]/30" 
                              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                          )}>
                            {token.graduated ? 'Graduated' : 'Active'}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-black/50 p-4 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest font-bold">Liquidity</div>
                            <div className="font-mono font-medium text-lg">{token.realSol.toFixed(2)} SOL</div>
                          </div>
                          <div className="bg-black/50 p-4 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest font-bold">Progress</div>
                            <div className="font-mono font-medium text-lg">{token.progress}%</div>
                          </div>
                          <div className="bg-black/50 p-4 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest font-bold">Team %</div>
                            <div className="font-mono font-medium text-lg">{token.teamPercent}%</div>
                          </div>
                          <div className="bg-black/50 p-4 border border-white/5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest font-bold">Vesting</div>
                            <div className={cn("font-mono font-medium text-lg", token.hasVesting ? "text-[#00ffd5]" : "text-gray-500")}>
                              {token.hasVesting ? 'Active' : 'None'}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-6">
                          <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Bonding Curve Progress</span>
                            <span>{token.progress}% to graduation</span>
                          </div>
                          <div className="h-2 bg-white/10 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-[#00ffd5] to-blue-500" 
                              style={{ width: `${token.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'airdrop' && (
              <div>
                <h2 className="text-3xl font-display font-black mb-8 tracking-tighter">AIRDROP TOOL</h2>
                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Token</label>
                    <select className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-xl text-white focus:outline-none focus:border-[#00ffd5] rounded-none">
                      {myTokens.map((token) => (
                        <option key={token.mint} value={token.mint} className="bg-black">
                          {token.name} (${token.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Recipients (Address, Amount)</label>
                    <p className="text-sm text-gray-500 mb-4">Format: address,amount (one per line)</p>
                    <textarea
                      className="w-full h-48 bg-white/[0.02] border border-white/20 p-4 text-white focus:outline-none focus:border-[#00ffd5] font-mono text-sm resize-none rounded-none placeholder:text-white/20"
                      placeholder="7xKX...3b9P,1000&#10;9yMZ...4c8Q,500"
                    />
                  </div>
                  <button className="w-full py-4 font-bold uppercase tracking-widest text-sm text-black bg-[#00ffd5] hover:bg-[#00ffd5]/90 glow-primary transition-all border border-[#00ffd5]">
                    Execute Airdrop
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'rev-share' && (
              <div>
                <h2 className="text-3xl font-display font-black mb-8 tracking-tighter">REVENUE SHARING</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <div className="bg-white/[0.02] border border-[#00ffd5]/30 p-8">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#00ffd5] mb-2">Total Distributed</div>
                    <div className="text-4xl font-mono font-bold text-white">0 SOL</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/10 p-8">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Next Distribution</div>
                    <div className="text-4xl font-mono font-bold text-white">--</div>
                  </div>
                </div>
                
                <h3 className="text-xl font-display font-bold mb-6">RECENT DISTRIBUTIONS</h3>
                <div className="text-center py-12 text-gray-500">
                  No distributions yet
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
