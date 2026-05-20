import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Database features disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Types
export interface User {
  id: string
  wallet_address: string
  nickname: string | null
  avatar_url: string | null
  created_at: string
}

export interface Token {
  id: string
  name: string
  ticker: string
  image_url: string | null
  supply: number
  mint_address: string | null
  creator_wallet: string
  has_vesting: boolean
  vesting_cliff_days: number | null
  vesting_unlock_days: number | null
  has_whitelist: boolean
  has_revenue_share: boolean
  revenue_share_percent: number | null
  created_at: string
}

// For bonding curve state tracking
export interface TokenRecord {
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  image_url?: string;
  metadata_uri?: string;
  virtual_sol?: number;
  virtual_tokens?: number;
  real_sol?: number;
  real_tokens?: number;
  price?: number;
  market_cap?: number;
  has_vesting?: boolean;
  team_percent?: number;
  cliff_days?: number;
  vesting_days?: number;
  graduated?: boolean;
}

export interface TradeRecord {
  mint: string;
  trader: string;
  trade_type: 'buy' | 'sell';
  sol_amount: number;
  token_amount: number;
  price_at_trade: number;
  tx_signature: string;
}

// User functions
export async function getOrCreateUser(walletAddress: string): Promise<User | null> {
  if (!supabase) return null;
  
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (existing) return existing

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ wallet_address: walletAddress })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return newUser
}

export async function updateUserNickname(walletAddress: string, nickname: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('users')
    .update({ nickname })
    .eq('wallet_address', walletAddress)

  return !error
}

// Token functions
export async function getTokens(): Promise<Token[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tokens:', error)
    return []
  }

  return data || []
}

export async function getTokenByMint(mintAddress: string): Promise<Token | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('mint_address', mintAddress)
    .single()

  if (error) return null
  return data
}

export async function getUserTokens(walletAddress: string): Promise<Token[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('creator_wallet', walletAddress)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

export async function createToken(token: Omit<Token, 'id' | 'created_at'>): Promise<Token | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('tokens')
    .insert(token)
    .select()
    .single()

  if (error) {
    console.error('Error creating token:', error)
    return null
  }

  return data
}

// ============ TRADE FUNCTIONS (MISSING FROM YOUR VERSION) ============

// Insert new token after creation (alternative to createToken for bonding curve data)
export async function insertToken(token: TokenRecord): Promise<boolean> {
  if (!supabase) {
    console.log('Supabase not configured, skipping token insert');
    return false;
  }

  const { error } = await supabase
    .from('tokens')
    .insert(token);

  if (error) {
    console.error('Failed to insert token:', error);
    return false;
  }

  console.log('Token inserted to Supabase:', token.mint);
  return true;
}

// Update token state after trade
export async function updateTokenState(
  mint: string,
  updates: Partial<TokenRecord>
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('tokens')
    .update(updates)
    .eq('mint', mint);

  if (error) {
    console.error('Failed to update token:', error);
    return false;
  }

  return true;
}

// Insert trade record
export async function insertTrade(trade: TradeRecord): Promise<boolean> {
  if (!supabase) {
    console.log('Supabase not configured, skipping trade insert');
    return false;
  }

  const { error } = await supabase
    .from('trades')
    .insert(trade);

  if (error) {
    console.error('Failed to insert trade:', error);
    return false;
  }

  console.log('Trade inserted to Supabase:', trade.tx_signature);
  return true;
}

// Fetch all tokens for Explore page
export async function fetchTokens(options?: {
  limit?: number;
  orderBy?: 'created_at' | 'market_cap' | 'real_sol';
  graduated?: boolean;
  hasVesting?: boolean;
}): Promise<TokenRecord[]> {
  if (!supabase) {
    console.log('Supabase not configured');
    return [];
  }

  let query = supabase
    .from('tokens')
    .select('*');

  if (options?.graduated !== undefined) {
    query = query.eq('graduated', options.graduated);
  }

  if (options?.hasVesting !== undefined) {
    query = query.eq('has_vesting', options.hasVesting);
  }

  query = query.order(options?.orderBy || 'created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch tokens:', error);
    return [];
  }

  return data || [];
}

// Fetch trade history for a token (for charts)
export async function fetchTradeHistory(
  mint: string,
  limit: number = 100
): Promise<TradeRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('mint', mint)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch trade history:', error);
    return [];
  }

  return data || [];
}

// Fetch tokens by creator (for Dashboard)
export async function fetchTokensByCreator(creator: string): Promise<TokenRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('creator', creator)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch tokens by creator:', error);
    return [];
  }
  return data || []
}
