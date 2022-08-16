use anchor_lang::{prelude::*, solana_program::instruction::Instruction};

#[account]
pub struct Multisig {
    /// Owners of the [Multisig]
    pub owners: Vec<Pubkey>,
    pub threshold: u8,
    /// Sequence of the ownership set
    ///
    /// This may be used to see if the owners on the multisig have changed
    /// since the last time the owners were checked. This is used on
    /// [Transaction] approval to ensure that owners cannot approve old
    /// transactions.
    pub owner_set_seqno: u32,
    /// Total number of [Transaction]s on this [Multisig]
    pub transaction_count: u32,
    pub nonce: u8,
    /// Bump seed for deriving PDA seeds
    pub bump: u8,
}

#[account]
pub struct Transaction {
    /// The [Multisig] account this transaction belongs to
    pub multisig: Pubkey,
    /// The auto-incremented integer index of the transaction
    pub index: u32,
    /// The proposer of the transaction
    pub proposer: Pubkey,
    /// The account that executed the [Transaction]
    pub executor: Pubkey,
    /// List of instructions
    pub instructions: Vec<TxInstruction>,
    /// signers[index] is true if multisig.owners[index] signed the transaction
    pub signers: Vec<bool>,
    /// Owner set sequence number
    pub owner_set_seqno: u32,
    /// Execution date
    pub executed_at: Option<i64>,
    /// Creation date
    pub created_at: i64,
    /// Bump seed for deriving PDA seeds
    pub bump: u8,
}

impl Transaction {
    /// Computes the space a [Transaction] uses.
    pub fn space(instructions: Vec<TxInstruction>) -> usize {
        8  // discriminator
            + std::mem::size_of::<Transaction>()
            + 4
            + (instructions.iter().map(|ix| ix.space()).sum::<usize>())
    }

    /// Number of signatures
    pub fn signatures_count(&self) -> usize {
        self.signers.iter().filter(|&did_sign| *did_sign).count()
    }
}

/// Instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TxInstruction {
    /// Target program to execute this instruction
    pub program_id: Pubkey,
    /// Metadata for what accounts should be passed to the instruction processor
    pub keys: Vec<TxAccountMeta>,
    /// Opaque data passed to the instruction processor
    pub data: Vec<u8>,
}

impl TxInstruction {
    /// Space that a [TxInstruction] takes up.
    pub fn space(&self) -> usize {
        std::mem::size_of::<Pubkey>()
            + (self.keys.len() as usize) * std::mem::size_of::<TxAccountMeta>()
            + (self.data.len() as usize)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TxAccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl From<&TxInstruction> for Instruction {
    fn from(tx: &TxInstruction) -> Instruction {
        Instruction {
            program_id: tx.program_id,
            accounts: tx.keys.clone().into_iter().map(Into::into).collect(),
            data: tx.data.clone(),
        }
    }
}

impl From<TxAccountMeta> for AccountMeta {
    fn from(TxAccountMeta { pubkey, is_signer, is_writable }: TxAccountMeta) -> AccountMeta {
        AccountMeta { pubkey, is_signer, is_writable }
    }
}
