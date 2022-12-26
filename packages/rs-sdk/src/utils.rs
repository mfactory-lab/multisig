use multisig::{state::{TxInstruction, TxAccountMeta}};
use pad::*;
use solana_program::{instruction::{AccountMeta, Instruction}};


pub fn fmt_base(base: &String ) -> [u8;32] {
    base.pad(32, '0', Alignment::Right, true).as_bytes()[0..32].try_into().unwrap()
}

pub fn decode_base(base: &[u8;32]) -> String {
    String::from_utf8(base.to_vec()).unwrap()
}

pub fn ctix(i: Instruction) -> TxInstruction {
    TxInstruction {
        program_id: i.program_id,
        data: i.data,
        keys: i.accounts.into_iter().map(|a| {ctam(a)}).collect()
    }
}

pub fn ctam(i: AccountMeta) -> TxAccountMeta {
    TxAccountMeta { pubkey: i.pubkey, is_signer: i.is_signer, is_writable: i.is_writable }
}