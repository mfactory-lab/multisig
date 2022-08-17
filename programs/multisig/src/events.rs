use crate::*;

#[event]
pub struct MultisigCreatedEvent {
    #[index]
    pub multisig: Pubkey,
    pub owners: Vec<Pubkey>,
    pub threshold: u8,
    pub timestamp: i64,
}

#[event]
pub struct TransactionCreatedEvent {
    #[index]
    pub multisig: Pubkey,
    #[index]
    pub transaction: Pubkey,
    pub proposer: Pubkey,
    pub instructions: Vec<TxInstruction>,
    pub timestamp: i64,
}

#[event]
pub struct TransactionApprovedEvent {
    #[index]
    pub multisig: Pubkey,
    #[index]
    pub transaction: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TransactionExecutedEvent {
    #[index]
    pub multisig: Pubkey,
    #[index]
    pub transaction: Pubkey,
    pub executor: Pubkey,
    pub timestamp: i64,
}
