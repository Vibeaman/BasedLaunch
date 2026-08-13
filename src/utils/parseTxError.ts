/**
 * Parses common Solana transaction errors into user-friendly messages
 * with clear recovery steps.
 */
export function parseTxError(err: any): string {
  const msg = (err?.message || err?.toString() || '').toLowerCase();
  const logs = (err?.logs || err?.simulationResponse?.logs || [])
    .join(' ')
    .toLowerCase();

  const combined = `${msg} ${logs}`;

  // --- Insufficient funds / SOL ---
  if (
    combined.includes('insufficient funds') ||
    combined.includes('insufficient lamports') ||
    combined.includes('0x1') // InsufficientFunds program error
  ) {
    return 'Not enough SOL in your wallet. Add more SOL and try again.';
  }

  // --- Slippage / price moved ---
  if (
    combined.includes('slippage') ||
    combined.includes('exceeds desired') ||
    combined.includes('price exceeded') ||
    combined.includes('0x1771') // common custom slippage error code
  ) {
    return 'Price moved too much while your transaction was processing. Try again or increase your slippage tolerance.';
  }

  // --- Transaction timeout / expired blockhash ---
  if (
    combined.includes('blockhash not found') ||
    combined.includes('block height exceeded') ||
    combined.includes('transaction was not confirmed') ||
    combined.includes('transactionexpired')
  ) {
    return 'Transaction timed out — the network is busy. Please try again.';
  }

  // --- User rejected in wallet ---
  if (
    combined.includes('user rejected') ||
    combined.includes('transaction cancelled') ||
    combined.includes('user denied')
  ) {
    return 'You cancelled the transaction in your wallet.';
  }

  // --- Wallet not connected ---
  if (
    combined.includes('wallet not connected') ||
    combined.includes('walletnotconnected')
  ) {
    return 'Your wallet is not connected. Connect your wallet and try again.';
  }

  // --- Insufficient token balance (for sells) ---
  if (
    combined.includes('insufficient token') ||
    combined.includes('token account not found') ||
    combined.includes('account does not exist')
  ) {
    return 'You don\'t have enough tokens for this trade. Check your balance and try again.';
  }

  // --- Network / RPC errors ---
  if (
    combined.includes('failed to fetch') ||
    combined.includes('network error') ||
    combined.includes('econnrefused') ||
    combined.includes('504') ||
    combined.includes('503')
  ) {
    return 'Network error — couldn\'t reach Solana. Check your connection and try again.';
  }

  // --- Account already exists (duplicate create) ---
  if (combined.includes('already in use') || combined.includes('account already exists')) {
    return 'This token already exists. Try creating with a different name.';
  }

  // --- Generic program error with code ---
  const programErrorMatch = msg.match(/custom program error: (0x[0-9a-f]+)/);
  if (programErrorMatch) {
    return `Transaction failed (program error ${programErrorMatch[1]}). Please try again or contact support if this persists.`;
  }

  // --- Fallback ---
  return 'Transaction failed. Please try again. If the problem continues, check your wallet balance and network connection.';
}
