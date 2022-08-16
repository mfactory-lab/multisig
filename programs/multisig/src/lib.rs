mod state;

use anchor_lang::{prelude::*, solana_program, solana_program::instruction::Instruction};
use state::*;
use std::{convert::Into, ops::Deref};

declare_id!("6tbPiQLgTU4ySYWyZGXbnVSAEzLc1uF8t5kJPXXgBmRP");

#[program]
pub mod multisig {
    use super::*;

    /// Initializes a new multisig account with
    /// a set of owners and a threshold.
    pub fn create_multisig(
        ctx: Context<CreateMultisig>,
        owners: Vec<Pubkey>,
        threshold: u8,
        nonce: u8,
    ) -> Result<()> {
        assert_unique_owners(&owners)?;
        require!(!owners.is_empty(), InvalidOwnersLen);
        require!(threshold > 0 && threshold <= owners.len() as u8, InvalidThreshold);

        let multisig = &mut ctx.accounts.multisig;
        multisig.owners = owners;
        multisig.threshold = threshold;
        multisig.nonce = nonce;
        multisig.owner_set_seqno = 0;
        Ok(())
    }

    /// Creates a new transaction account, automatically signed by the creator,
    /// which must be one of the owners of the multisig.
    pub fn create_transaction(
        ctx: Context<CreateTransaction>,
        pid: Pubkey,
        accs: Vec<TransactionAccount>,
        data: Vec<u8>,
    ) -> Result<()> {
        let multisig = &mut ctx.accounts.multisig;

        let owner_index = multisig
            .owners
            .iter()
            .position(|a| a == ctx.accounts.proposer.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        let mut signers = Vec::new();
        signers.resize(multisig.owners.len(), false);
        signers[owner_index] = true;

        let timestamp = Clock::get()?.unix_timestamp;
        let index = multisig.transaction_count.saturating_add(1);

        let tx = &mut ctx.accounts.transaction;
        tx.proposer = ctx.accounts.proposer.key();
        tx.program_id = pid;
        tx.accounts = accs;
        tx.data = data;
        tx.signers = signers;
        tx.multisig = multisig.key();
        tx.owner_set_seqno = multisig.owner_set_seqno;
        tx.index = index;
        tx.executed_at = None;
        tx.created_at = timestamp;

        multisig.transaction_count = index;

        Ok(())
    }

    /// Approves a transaction on behalf of an owner of the multisig.
    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        let owner_index = ctx
            .accounts
            .multisig
            .owners
            .iter()
            .position(|a| a == ctx.accounts.owner.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        ctx.accounts.transaction.signers[owner_index] = true;

        Ok(())
    }

    /// Sets the owners field on the multisig. The only way this can be invoked
    /// is via a recursive call from execute_transaction -> set_owners.
    pub fn set_owners(ctx: Context<Auth>, owners: Vec<Pubkey>) -> Result<()> {
        require!(!owners.is_empty(), InvalidOwnersLen);

        assert_unique_owners(&owners)?;

        let multisig = &mut ctx.accounts.multisig;
        let owners_len = owners.len() as u8;

        if owners_len < multisig.threshold {
            multisig.threshold = owners_len;
        }

        multisig.owners = owners;
        multisig.owner_set_seqno += 1;

        Ok(())
    }

    /// Changes the execution threshold of the multisig. The only way this can be
    /// invoked is via a recursive call from execute_transaction ->
    /// change_threshold.
    pub fn change_threshold(ctx: Context<Auth>, threshold: u8) -> Result<()> {
        let multisig = &mut ctx.accounts.multisig;
        require!(threshold > 0 && threshold <= multisig.owners.len() as u8, InvalidThreshold);
        multisig.threshold = threshold;
        Ok(())
    }

    /// Executes the given transaction if threshold owners have signed it.
    pub fn execute_transaction(ctx: Context<ExecuteTransaction>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;

        if transaction.executed_at.is_some() {
            return Err(ErrorCode::AlreadyExecuted.into());
        }

        let multisig = &mut ctx.accounts.multisig;

        let sig_count = transaction.signers.iter().filter(|&s| *s).count() as u8;
        require!(sig_count >= multisig.threshold, NotEnoughSigners);

        // Execute the transaction signed by the multisig
        let mut ix: Instruction = transaction.as_ref().deref().into();
        ix.accounts = ix
            .accounts
            .iter()
            .map(|acc| {
                let mut acc = acc.clone();
                if &acc.pubkey == ctx.accounts.multisig_signer.key {
                    acc.is_signer = true;
                }
                acc
            })
            .collect();

        let multisig_key = multisig.key();
        let signer_seeds = &[multisig_key.as_ref(), &[multisig.nonce]];

        solana_program::program::invoke_signed(&ix, ctx.remaining_accounts, &[&signer_seeds[..]])?;

        let timestamp = Clock::get()?.unix_timestamp;

        transaction.executed_at = Some(timestamp);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMultisig<'info> {
    #[account(zero, signer)]
    multisig: Box<Account<'info, Multisig>>,
}

#[derive(Accounts)]
pub struct CreateTransaction<'info> {
    multisig: Box<Account<'info, Multisig>>,
    #[account(zero, signer)]
    transaction: Box<Account<'info, Transaction>>,
    // One of the multisig owners. Checked in the handler.
    proposer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(constraint = multisig.owner_set_seqno == transaction.owner_set_seqno)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(mut, has_one = multisig)]
    transaction: Box<Account<'info, Transaction>>,
    // One of the multisig owners. Checked in the handler.
    owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(mut)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(
        seeds = [multisig.key().as_ref()],
        bump = multisig.nonce,
    )]
    multisig_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(constraint = multisig.owner_set_seqno == transaction.owner_set_seqno)]
    multisig: Box<Account<'info, Multisig>>,
    /// CHECK: multisig_signer is a PDA program signer. Data is never read or written to
    #[account(
        seeds = [multisig.key().as_ref()],
        bump = multisig.nonce,
    )]
    multisig_signer: UncheckedAccount<'info>,
    #[account(mut, has_one = multisig)]
    transaction: Box<Account<'info, Transaction>>,
}

fn assert_unique_owners(keys: &[Pubkey]) -> Result<()> {
    require!(!(1..keys.len()).any(|i| keys[i..].contains(&keys[i - 1])), UniqueOwners);
    Ok(())
}

#[test]
fn test_assert_unique_owners() {
    use std::str::FromStr;
    let keys = [
        "HRo3D2JMJhkicvYjYJkHceVWH1BRrLXRjaxKTDK4KrGa",
        "HEARTpF3zokEZWTXjBbNmQfzdEF7gHZniGTfQydsmWo5",
        "4rDeDfcyN1JVckULawSxvQkrnbYm3GjuGJGyog4yvyYH",
        "4rDeDfcyN1JVckULawSxvQkrnbYm3GjuGJGyog4yvyY3",
    ]
    .map(|k| Pubkey::from_str(k).unwrap());
    let has_duplicates = (1..keys.len()).any(|i| keys[i..].contains(&keys[i - 1]));
    assert!(!has_duplicates);
}

#[error_code]
pub enum ErrorCode {
    #[msg("The given owner is not part of this multisig.")]
    InvalidOwner,
    #[msg("Owners length must be non zero.")]
    InvalidOwnersLen,
    #[msg("Not enough owners signed this transaction.")]
    NotEnoughSigners,
    #[msg("Cannot delete a transaction that has been signed by an owner.")]
    TransactionAlreadySigned,
    #[msg("Overflow when adding.")]
    Overflow,
    #[msg("Cannot delete a transaction the owner did not create.")]
    UnableToDelete,
    #[msg("The given transaction has already been executed.")]
    AlreadyExecuted,
    #[msg("Threshold must be less than or equal to the number of owners.")]
    InvalidThreshold,
    #[msg("Owners must be unique")]
    UniqueOwners,
}
