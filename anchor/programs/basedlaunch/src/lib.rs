//! BasedLaunch — bonding-curve token launchpad (reconstructed).
//!
//! This program was reconstructed from the on-chain deployment
//! (D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn) and the frontend's embedded
//! interface after the original Rust source was lost. It preserves:
//!   * instruction discriminators for `create_token` and `buy` (Anchor default naming),
//!   * the exact `BondingCurve` account field order the frontend parses,
//!   * the PDA seeds (`mint-authority`, `curve`, `sol-vault`, `vesting-vault`),
//!   * the account order of each instruction the frontend already sends,
//!   * SOL held in a program-owned `sol-vault` (sell pays out by direct lamport debit,
//!     which is why `sell` needs no System Program account — matching the original).
//!
//! It also FIXES/ADDS (documented — verify on devnet before mainnet):
//!   * `buy`/`sell` now enforce `min_tokens_out` / `min_sol_out` (real slippage protection),
//!   * whitelist is now actually enforced on-chain (was ignored before),
//!   * freeze authority is renounced at mint creation.
//!
//! NOTE: the on-chain `sell` used a non-standard function name we could not recover,
//! so this `sell` gets Anchor's default discriminator for the name `sell`. Update the
//! frontend `SELL_DISCRIMINATOR` to match after `anchor build` (see README).

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::Discriminator;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
    Metadata,
};
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};

declare_id!("D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn");

// ------------------------------------------------------------------ constants

/// Platform fee wallet (from the original deployment).
pub const FEE_WALLET: Pubkey = pubkey!("HpoDxdfvC6PSeupnhH1YXbuiQT4zkot3pCetQim7x5Mj");

/// SPL decimals for launched tokens.
pub const DECIMALS: u8 = 6;
/// Fixed total supply, in whole tokens.
pub const TOTAL_SUPPLY: u64 = 1_000_000_000;
/// Virtual reserves that seed the curve (lamports / whole tokens).
pub const VIRTUAL_SOL_INIT: u64 = 30_000_000_000; // 30 SOL
pub const VIRTUAL_TOKENS_INIT: u64 = 1_000_000_000; // 1B whole tokens
/// Real SOL (lamports) at which the curve graduates.
pub const GRADUATION_LAMPORTS: u64 = 69_000_000_000; // 69 SOL
/// One-time creation fee paid to FEE_WALLET (~$1; adjust as needed).
pub const CREATE_FEE_LAMPORTS: u64 = 20_000_000; // 0.02 SOL

const NAME_MAX: usize = 32;
const SYMBOL_MAX: usize = 10;
const URI_MAX: usize = 200;

#[program]
pub mod basedlaunch {
    use super::*;

    /// Create a new token: mint, metadata, bonding curve, optional team vesting.
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        uri: String,
        has_vesting: bool,
        cliff_seconds: i64,
        vesting_duration: i64,
        team_percent: u8,
        whitelist_duration: i64,
    ) -> Result<()> {
        require!(!name.is_empty() && name.len() <= NAME_MAX, LaunchError::InvalidName);
        require!(!symbol.is_empty() && symbol.len() <= SYMBOL_MAX, LaunchError::InvalidSymbol);
        require!(uri.len() <= URI_MAX, LaunchError::InvalidUri);
        require!(team_percent <= 100, LaunchError::InvalidTeamAllocation);
        require!(cliff_seconds >= 0 && vesting_duration >= 0 && whitelist_duration >= 0, LaunchError::InvalidArgument);

        let now = Clock::get()?.unix_timestamp;

        // --- one-time creation fee ---
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.fee_wallet.to_account_info(),
                },
            ),
            CREATE_FEE_LAMPORTS,
        )?;

        let mint_key = ctx.accounts.mint.key();
        let ma_bump = ctx.bumps.mint_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint-authority", mint_key.as_ref(), &[ma_bump]]];

        // --- create Metaplex metadata ---
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.mint_authority.to_account_info(),
                    update_authority: ctx.accounts.mint_authority.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer_seeds,
            ),
            DataV2 {
                name: name.clone(),
                symbol: symbol.clone(),
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            None, // collection_details
        )?;

        // --- optional team allocation → vesting vault ---
        let mut team_amount_base: u64 = 0;
        if has_vesting && team_percent > 0 {
            let team_whole = (TOTAL_SUPPLY as u128)
                .checked_mul(team_percent as u128)
                .unwrap()
                / 100u128;
            team_amount_base = (team_whole as u64)
                .checked_mul(10u64.pow(DECIMALS as u32))
                .ok_or(LaunchError::MathOverflow)?;

            if team_amount_base > 0 {
                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.mint.to_account_info(),
                            to: ctx.accounts.vesting_vault.to_account_info(),
                            authority: ctx.accounts.mint_authority.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    team_amount_base,
                )?;
            }
        }

        // --- initialise bonding curve state ---
        let curve = &mut ctx.accounts.curve;
        curve.creator = ctx.accounts.payer.key();
        curve.mint = mint_key;
        curve.name = name;
        curve.symbol = symbol;
        curve.virtual_sol = VIRTUAL_SOL_INIT;
        curve.virtual_tokens = VIRTUAL_TOKENS_INIT;
        curve.real_sol = 0;
        curve.real_tokens = 0;
        curve.token_supply = TOTAL_SUPPLY;
        curve.graduated = false;
        curve.created_at = now;
        curve.has_vesting = has_vesting && team_percent > 0;
        curve.team_percent = team_percent;
        curve.cliff_seconds = cliff_seconds;
        curve.vesting_duration = vesting_duration;
        curve.whitelist_end = if whitelist_duration > 0 { now + whitelist_duration } else { 0 };
        curve.bump = ctx.bumps.curve;

        // record the sol vault bump for later signing/debits
        ctx.accounts.sol_vault.bump = ctx.bumps.sol_vault;

        emit!(TokenCreated {
            mint: mint_key,
            creator: curve.creator,
            has_vesting: curve.has_vesting,
            team_amount_base,
        });
        Ok(())
    }

    /// Buy tokens from the bonding curve with SOL. Enforces `min_tokens_out`.
    /// If the token is in its whitelist window, a valid WhitelistEntry PDA for the
    /// buyer must be supplied in `remaining_accounts`.
    pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        require!(sol_amount > 0, LaunchError::InvalidArgument);
        let now = Clock::get()?.unix_timestamp;

        let curve = &mut ctx.accounts.curve;
        require!(!curve.graduated, LaunchError::CurveGraduated);

        // --- whitelist gate ---
        if curve.whitelist_end > now {
            enforce_whitelist(&curve.mint, &ctx.accounts.buyer.key(), ctx.remaining_accounts)?;
        }

        // --- constant-product quote (u128 to avoid overflow) ---
        let sol_reserve = (curve.virtual_sol as u128) + (curve.real_sol as u128);
        let token_reserve = (curve.virtual_tokens as u128) - (curve.real_tokens as u128);
        let k = sol_reserve.checked_mul(token_reserve).ok_or(LaunchError::MathOverflow)?;

        let new_sol_reserve = sol_reserve.checked_add(sol_amount as u128).ok_or(LaunchError::MathOverflow)?;
        let new_token_reserve = k / new_sol_reserve;
        let tokens_out_u128 = token_reserve.checked_sub(new_token_reserve).ok_or(LaunchError::MathOverflow)?;
        let tokens_out = tokens_out_u128 as u64; // whole tokens
        require!(tokens_out > 0, LaunchError::OutputTooSmall);

        // do not sell more than the curve allocation (total supply minus team allocation)
        let team_whole = (TOTAL_SUPPLY as u128) * (curve.team_percent as u128) / 100u128;
        let sellable = TOTAL_SUPPLY - team_whole as u64;
        require!(curve.real_tokens + tokens_out <= sellable, LaunchError::CurveComplete);

        // --- slippage protection ---
        require!(tokens_out >= min_tokens_out, LaunchError::SlippageExceeded);

        // --- move SOL: buyer -> sol_vault (System CPI; buyer signs) ---
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.sol_vault.to_account_info(),
                },
            ),
            sol_amount,
        )?;

        // --- mint tokens to buyer (mint authority PDA signs) ---
        let mint_key = curve.mint;
        let ma_bump = ctx.bumps.mint_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint-authority", mint_key.as_ref(), &[ma_bump]]];
        let amount_base = tokens_out
            .checked_mul(10u64.pow(DECIMALS as u32))
            .ok_or(LaunchError::MathOverflow)?;
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount_base,
        )?;

        // --- update state ---
        curve.real_sol = curve.real_sol.checked_add(sol_amount).ok_or(LaunchError::MathOverflow)?;
        curve.real_tokens = curve.real_tokens.checked_add(tokens_out).ok_or(LaunchError::MathOverflow)?;
        if curve.real_sol >= GRADUATION_LAMPORTS {
            curve.graduated = true;
            emit!(Graduated { mint: mint_key, real_sol: curve.real_sol });
        }

        emit!(Trade {
            mint: mint_key,
            trader: ctx.accounts.buyer.key(),
            is_buy: true,
            sol_amount,
            token_amount: tokens_out,
        });
        Ok(())
    }

    /// Sell tokens back to the bonding curve for SOL. Enforces `min_sol_out`.
    /// Pays out by direct lamport debit of the program-owned sol-vault, so no
    /// System Program account is required (matches the original ABI).
    pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        require!(token_amount > 0, LaunchError::InvalidArgument);

        let curve = &mut ctx.accounts.curve;
        require!(!curve.graduated, LaunchError::CurveGraduated);
        require!(token_amount <= curve.real_tokens, LaunchError::InsufficientCurveTokens);

        // --- constant-product quote ---
        let sol_reserve = (curve.virtual_sol as u128) + (curve.real_sol as u128);
        let token_reserve = (curve.virtual_tokens as u128) - (curve.real_tokens as u128);
        let k = sol_reserve.checked_mul(token_reserve).ok_or(LaunchError::MathOverflow)?;

        let new_token_reserve = token_reserve.checked_add(token_amount as u128).ok_or(LaunchError::MathOverflow)?;
        let new_sol_reserve = k / new_token_reserve;
        let sol_out_u128 = sol_reserve.checked_sub(new_sol_reserve).ok_or(LaunchError::MathOverflow)?;
        let sol_out = sol_out_u128 as u64; // lamports
        require!(sol_out > 0, LaunchError::OutputTooSmall);
        require!(sol_out <= curve.real_sol, LaunchError::InsufficientVault);

        // --- slippage protection ---
        require!(sol_out >= min_sol_out, LaunchError::SlippageExceeded);

        // --- burn seller tokens (seller signs) ---
        let amount_base = token_amount
            .checked_mul(10u64.pow(DECIMALS as u32))
            .ok_or(LaunchError::MathOverflow)?;
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            amount_base,
        )?;

        // --- pay SOL out of the program-owned vault by direct lamport move ---
        let vault_ai = ctx.accounts.sol_vault.to_account_info();
        let seller_ai = ctx.accounts.seller.to_account_info();
        // keep the vault rent-exempt
        let rent_min = Rent::get()?.minimum_balance(vault_ai.data_len());
        require!(
            vault_ai.lamports().saturating_sub(sol_out) >= rent_min,
            LaunchError::InsufficientVault
        );
        **vault_ai.try_borrow_mut_lamports()? -= sol_out;
        **seller_ai.try_borrow_mut_lamports()? += sol_out;

        // --- update state ---
        curve.real_sol -= sol_out;
        curve.real_tokens -= token_amount;

        emit!(Trade {
            mint: curve.mint,
            trader: ctx.accounts.seller.key(),
            is_buy: false,
            sol_amount: sol_out,
            token_amount,
        });
        Ok(())
    }

    /// Claim linearly-vested team tokens (creator only). Vesting is derived from the
    /// curve schedule; already-claimed is inferred from the vault balance.
    pub fn claim_vested(ctx: Context<ClaimVested>) -> Result<()> {
        let curve = &ctx.accounts.curve;
        require!(curve.has_vesting, LaunchError::NoVesting);
        require_keys_eq!(ctx.accounts.beneficiary.key(), curve.creator, LaunchError::Unauthorized);

        let now = Clock::get()?.unix_timestamp;
        let cliff_time = curve.created_at + curve.cliff_seconds;
        let end_time = cliff_time + curve.vesting_duration;

        let team_whole = (TOTAL_SUPPLY as u128) * (curve.team_percent as u128) / 100u128;
        let original_total = (team_whole as u64)
            .checked_mul(10u64.pow(DECIMALS as u32))
            .ok_or(LaunchError::MathOverflow)?;
        require!(original_total > 0, LaunchError::NoVesting);

        // vested so far
        let vested: u64 = if now < cliff_time {
            0
        } else if now >= end_time || curve.vesting_duration == 0 {
            original_total
        } else {
            let elapsed = (now - cliff_time) as u128;
            let dur = (end_time - cliff_time) as u128;
            ((original_total as u128) * elapsed / dur) as u64
        };

        let vault_balance = ctx.accounts.vesting_vault.amount;
        let already_claimed = original_total.saturating_sub(vault_balance);
        let claimable = vested.saturating_sub(already_claimed);
        require!(claimable > 0, LaunchError::NothingToClaim);

        let mint_key = curve.mint;
        let ma_bump = ctx.bumps.mint_authority;
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint-authority", mint_key.as_ref(), &[ma_bump]]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.vesting_vault.to_account_info(),
                    to: ctx.accounts.beneficiary_token_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer_seeds,
            ),
            claimable,
        )?;
        Ok(())
    }

    /// Add a wallet to a token's whitelist (creator only).
    pub fn add_to_whitelist(ctx: Context<AddToWhitelist>) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.curve.creator, LaunchError::Unauthorized);
        let entry = &mut ctx.accounts.whitelist_entry;
        entry.mint = ctx.accounts.curve.mint;
        entry.wallet = ctx.accounts.wallet.key();
        entry.bump = ctx.bumps.whitelist_entry;
        Ok(())
    }
}

// --------------------------------------------------------------- whitelist util

/// Validate that `remaining_accounts[0]` is an initialized WhitelistEntry PDA for
/// (mint, buyer) owned by this program.
fn enforce_whitelist(mint: &Pubkey, buyer: &Pubkey, remaining: &[AccountInfo]) -> Result<()> {
    let entry_ai = remaining.first().ok_or(LaunchError::NotWhitelisted)?;
    let (expected, _bump) =
        Pubkey::find_program_address(&[b"whitelist", mint.as_ref(), buyer.as_ref()], &crate::ID);
    require_keys_eq!(*entry_ai.key, expected, LaunchError::NotWhitelisted);
    require_keys_eq!(*entry_ai.owner, crate::ID, LaunchError::NotWhitelisted);
    // must be initialized (has the WhitelistEntry discriminator)
    let data = entry_ai.try_borrow_data()?;
    require!(data.len() >= 8, LaunchError::NotWhitelisted);
    require!(&data[..8] == WhitelistEntry::DISCRIMINATOR.as_slice(), LaunchError::NotWhitelisted);
    Ok(())
}

// ------------------------------------------------------------------- accounts

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = DECIMALS,
        mint::authority = mint_authority,
        // freeze authority intentionally omitted -> None (renounced)
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: PDA that owns mint + metadata update authority.
    #[account(seeds = [b"mint-authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Metaplex metadata account, created via CPI.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        token::mint = mint,
        token::authority = mint_authority,
        seeds = [b"vesting-vault", mint.key().as_ref()],
        bump
    )]
    pub vesting_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"curve", mint.key().as_ref()],
        bump
    )]
    pub curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = payer,
        space = 8 + SolVault::INIT_SPACE,
        seeds = [b"sol-vault", mint.key().as_ref()],
        bump
    )]
    pub sol_vault: Account<'info, SolVault>,

    /// CHECK: fixed platform fee wallet.
    #[account(mut, address = FEE_WALLET)]
    pub fee_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut, address = curve.mint)]
    pub mint: Account<'info, Mint>,

    /// CHECK: mint authority PDA.
    #[account(seeds = [b"mint-authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump)]
    pub curve: Account<'info, BondingCurve>,

    #[account(mut, seeds = [b"sol-vault", mint.key().as_ref()], bump = sol_vault.bump)]
    pub sol_vault: Account<'info, SolVault>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    // Optional: WhitelistEntry PDA passed via remaining_accounts during the window.
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut, address = curve.mint)]
    pub mint: Account<'info, Mint>,

    /// CHECK: mint authority PDA (unused for signing here but kept for ABI parity).
    #[account(seeds = [b"mint-authority", mint.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump)]
    pub curve: Account<'info, BondingCurve>,

    #[account(mut, seeds = [b"sol-vault", mint.key().as_ref()], bump = sol_vault.bump)]
    pub sol_vault: Account<'info, SolVault>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimVested<'info> {
    #[account(mut)]
    pub beneficiary: Signer<'info>,

    #[account(seeds = [b"curve", curve.mint.as_ref()], bump = curve.bump)]
    pub curve: Account<'info, BondingCurve>,

    /// CHECK: mint authority PDA (vault authority).
    #[account(seeds = [b"mint-authority", curve.mint.as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut, seeds = [b"vesting-vault", curve.mint.as_ref()], bump)]
    pub vesting_vault: Account<'info, TokenAccount>,

    #[account(mut, address = curve.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = beneficiary,
        associated_token::mint = mint,
        associated_token::authority = beneficiary
    )]
    pub beneficiary_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct AddToWhitelist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [b"curve", curve.mint.as_ref()], bump = curve.bump)]
    pub curve: Account<'info, BondingCurve>,

    /// CHECK: wallet address being whitelisted.
    pub wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + WhitelistEntry::INIT_SPACE,
        seeds = [b"whitelist", curve.mint.as_ref(), wallet.key().as_ref()],
        bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    pub system_program: Program<'info, System>,
}

// --------------------------------------------------------------------- state

#[account]
#[derive(InitSpace)]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(10)]
    pub symbol: String,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
    pub real_sol: u64,
    pub real_tokens: u64,
    pub token_supply: u64,
    pub graduated: bool,
    pub created_at: i64,
    pub has_vesting: bool,
    pub team_percent: u8,
    pub cliff_seconds: i64,
    pub vesting_duration: i64,
    // ---- appended fields (frontend parser stops before here; safe to add) ----
    pub whitelist_end: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SolVault {
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistEntry {
    pub mint: Pubkey,
    pub wallet: Pubkey,
    pub bump: u8,
}

// --------------------------------------------------------------------- events

#[event]
pub struct TokenCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub has_vesting: bool,
    pub team_amount_base: u64,
}

#[event]
pub struct Trade {
    pub mint: Pubkey,
    pub trader: Pubkey,
    pub is_buy: bool,
    pub sol_amount: u64,
    pub token_amount: u64,
}

#[event]
pub struct Graduated {
    pub mint: Pubkey,
    pub real_sol: u64,
}

// --------------------------------------------------------------------- errors

#[error_code]
pub enum LaunchError {
    #[msg("Invalid token name")]
    InvalidName,
    #[msg("Invalid token symbol")]
    InvalidSymbol,
    #[msg("Invalid metadata URI")]
    InvalidUri,
    #[msg("Invalid team allocation")]
    InvalidTeamAllocation,
    #[msg("Invalid argument")]
    InvalidArgument,
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Output amount too small")]
    OutputTooSmall,
    #[msg("Curve has graduated; trading is closed")]
    CurveGraduated,
    #[msg("Curve token allocation is exhausted")]
    CurveComplete,
    #[msg("Not enough tokens in the curve")]
    InsufficientCurveTokens,
    #[msg("Not enough SOL in the vault")]
    InsufficientVault,
    #[msg("Buyer is not whitelisted for this launch window")]
    NotWhitelisted,
    #[msg("This token has no vesting")]
    NoVesting,
    #[msg("Nothing to claim yet")]
    NothingToClaim,
    #[msg("Unauthorized")]
    Unauthorized,
}
