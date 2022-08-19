mod events;
mod state;

use std::convert::Into;

use anchor_lang::{prelude::*, solana_program};
use events::*;
use state::*;

declare_id!("4GUuiefBoY1Qeou69d2bM2mQTEgr8wBFes3KqZaFXZzn");

#[program]
pub mod multisig {
    use super::*;

    /// Initializes a new multisig account with
    /// a set of owners and a threshold.
    pub fn create_multisig(
        ctx: Context<CreateMultisig>,
        key: Pubkey,
        owners: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        require!(!owners.is_empty(), EmptyOwners);
        require!(threshold > 0 && threshold <= owners.len() as u8, InvalidThreshold);

        assert_unique_owners(&owners)?;

        let multisig = &mut ctx.accounts.multisig;
        multisig.key = key;
        multisig.owners = owners.clone();
        multisig.threshold = threshold;
        multisig.transaction_count = 0;
        multisig.owner_set_seqno = 0;
        multisig.bump = *ctx.bumps.get("multisig").unwrap();

        let (_, signer_bump) = Pubkey::find_program_address(&[multisig.key().as_ref()], &crate::ID);
        multisig.signer_bump = signer_bump;

        emit!(MultisigCreatedEvent {
            multisig: multisig.key(),
            owners,
            threshold,
            timestamp: Clock::get()?.unix_timestamp
        });

        Ok(())
    }

    /// Creates a new transaction account, automatically signed by the creator,
    /// which must be one of the owners of the multisig.
    pub fn create_transaction(ctx: Context<CreateTransaction>, instructions: Vec<TxInstruction>) -> Result<()> {
        let multisig = &mut ctx.accounts.multisig;

        let owner_index = multisig
            .owner_index(ctx.accounts.proposer.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        let mut signers = Vec::new();
        signers.resize(multisig.owners.len(), false);
        signers[owner_index] = true;

        let tx = &mut ctx.accounts.transaction;
        tx.proposer = ctx.accounts.proposer.key();
        tx.executor = Pubkey::default();
        tx.instructions = instructions.clone();
        tx.signers = signers;
        tx.multisig = multisig.key();
        tx.owner_set_seqno = multisig.owner_set_seqno;
        tx.index = multisig.transaction_count;
        tx.executed_at = None;
        tx.created_at = Clock::get()?.unix_timestamp;
        tx.bump = *ctx.bumps.get("transaction").unwrap();

        multisig.transaction_count = multisig.transaction_count.saturating_add(1);

        emit!(TransactionCreatedEvent {
            multisig: multisig.key(),
            transaction: tx.key(),
            proposer: tx.proposer,
            instructions,
            timestamp: tx.created_at
        });

        Ok(())
    }

    /// Approves a transaction on behalf of an owner of the multisig.
    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        let multisig = &ctx.accounts.multisig;

        let owner_index = multisig
            .owner_index(ctx.accounts.owner.key)
            .ok_or(ErrorCode::InvalidOwner)?;

        let tx = &mut ctx.accounts.transaction;

        require!(!tx.signers[owner_index], AlreadyApproved);

        tx.signers[owner_index] = true;

        emit!(TransactionApprovedEvent {
            multisig: multisig.key(),
            transaction: tx.key(),
            owner: ctx.accounts.owner.key(),
            timestamp: tx.created_at
        });

        Ok(())
    }

    /// Sets the owners field on the multisig. The only way this can be invoked
    /// is via a recursive call from execute_transaction -> set_owners.
    pub fn set_owners(ctx: Context<Auth>, owners: Vec<Pubkey>) -> Result<()> {
        require!(!owners.is_empty(), EmptyOwners);

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
        require!(
            threshold > 0 && threshold <= multisig.owners.len() as u8,
            InvalidThreshold
        );
        multisig.threshold = threshold;
        Ok(())
    }

    /// Executes the given transaction if threshold owners have signed it.
    pub fn execute_transaction(ctx: Context<ExecuteTransaction>) -> Result<()> {
        let tx = &mut ctx.accounts.transaction;

        require!(tx.executed_at.is_none(), AlreadyExecuted);

        let multisig = &mut ctx.accounts.multisig;

        require!(tx.sig_count() >= multisig.threshold as usize, NotEnoughSigners);

        let key = &multisig.key();
        let seeds = [key.as_ref(), &[multisig.signer_bump]];

        for ix in tx.instructions.iter() {
            solana_program::program::invoke_signed(&ix.into(), ctx.remaining_accounts, &[&seeds])?;
        }

        tx.executor = ctx.accounts.executor.key();
        tx.executed_at = Some(Clock::get()?.unix_timestamp);

        emit!(TransactionExecutedEvent {
            multisig: *key,
            transaction: tx.key(),
            executor: tx.executor,
            timestamp: tx.created_at
        });

        Ok(())
    }

    /// Close the given transaction
    pub fn close_transaction(_ctx: Context<CloseTransaction>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(key: Pubkey, owners: Vec<Pubkey>)]
pub struct CreateMultisig<'info> {
    #[account(
        init,
        seeds = [
            Multisig::SEED_PREFIX,
            key.as_ref()
        ],
        bump,
        payer = payer,
        space = Multisig::space(owners.len() as u8),
    )]
    multisig: Box<Account<'info, Multisig>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(instructions: Vec<TxInstruction>)]
pub struct CreateTransaction<'info> {
    #[account(
        mut,
        seeds = [Multisig::SEED_PREFIX, multisig.key.as_ref()],
        bump = multisig.bump,
    )]
    multisig: Box<Account<'info, Multisig>>,
    #[account(
        init,
        seeds = [
            Transaction::SEED_PREFIX,
            multisig.key().as_ref(),
            multisig.transaction_count.to_le_bytes().as_ref()
        ],
        bump,
        payer = proposer,
        space = Transaction::space(instructions),
    )]
    transaction: Box<Account<'info, Transaction>>,
    #[account(mut)]
    proposer: Signer<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(constraint = multisig.owner_set_seqno == transaction.owner_set_seqno)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(mut, has_one = multisig)]
    transaction: Box<Account<'info, Transaction>>,
    owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct Auth<'info> {
    #[account(mut)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(
        seeds = [multisig.key().as_ref()],
        bump = multisig.signer_bump,
    )]
    multisig_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(constraint = multisig.owner_set_seqno == transaction.owner_set_seqno)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(mut, has_one = multisig)]
    transaction: Box<Account<'info, Transaction>>,
    executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseTransaction<'info> {
    #[account(constraint = multisig.owner_index(owner.key).is_some() @ ErrorCode::InvalidOwner)]
    multisig: Box<Account<'info, Multisig>>,
    #[account(mut, has_one = multisig, close = owner)]
    transaction: Box<Account<'info, Transaction>>,
    owner: Signer<'info>,
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
    #[msg("The given owner is not part of this multisig")]
    InvalidOwner,
    #[msg("Owners length must be non zero")]
    EmptyOwners,
    #[msg("Owners must be unique")]
    UniqueOwners,
    #[msg("Not enough owners signed this transaction")]
    NotEnoughSigners,
    #[msg("The given transaction has already been executed")]
    AlreadyExecuted,
    #[msg("The owner has already approved the transaction")]
    AlreadyApproved,
    #[msg("Threshold must be less than or equal to the number of owners")]
    InvalidThreshold,
}
