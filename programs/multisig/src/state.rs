use anchor_lang::{prelude::*, solana_program::instruction::Instruction};

#[account]
pub struct Multisig {
    /// Base key used to generate the PDA.
    pub base: [u8; 32],
    /// Owners of the [Multisig]
    pub owners: Vec<Pubkey>,
    /// Minimum number of owner approvals needed to sign a [Transaction]
    pub threshold: u8,
    /// Total number of [Transaction]s on this [Multisig]
    pub transaction_count: u32,
    /// Sequence of the ownership change
    pub owner_set_seqno: u32,
    /// Bump seed for deriving PDA seeds
    pub bump: u8,
    /// Signer bump seed for deriving PDA seeds
    pub signer_bump: u8,
}

impl Multisig {
    pub const SEED_PREFIX: &'static [u8] = b"multisig";

    pub fn space(max_owners: u8) -> usize {
        8 // discriminator
            + std::mem::size_of::<Multisig>()
            + 4
            + std::mem::size_of::<Pubkey>() * (max_owners as usize)
    }

    pub fn owner_index(&self, key: &Pubkey) -> Option<usize> {
        self.owners.iter().position(|a| a == key)
    }
}

#[account]
pub struct Transaction {
    /// The [Multisig] account this transaction belongs to
    pub multisig: Pubkey,
    /// The auto-incremented integer index of the transaction
    pub index: u32,
    /// The proposer of the transaction
    pub proposer: Pubkey,
    /// The account that executed the transaction
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
    pub const SEED_PREFIX: &'static [u8] = b"transaction";

    pub fn space(instructions: Vec<TxInstruction>) -> usize {
        8  // discriminator
            + std::mem::size_of::<Transaction>()
            + 4
            + (instructions.iter().map(|ix| ix.space()).sum::<usize>())
    }

    /// Number of approvals
    pub fn sig_count(&self) -> usize {
        self.signers.iter().filter(|&did_sign| *did_sign).count()
    }
}

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
    fn from(
        TxAccountMeta {
            pubkey,
            is_signer,
            is_writable,
        }: TxAccountMeta,
    ) -> AccountMeta {
        AccountMeta {
            pubkey,
            is_signer,
            is_writable,
        }
    }
}
