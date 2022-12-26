
use anchor_client::{solana_sdk::pubkey::Pubkey, Program};
use multisig::{id as multisig_id};
use anchor_lang::{AccountDeserialize, Key};
use multisig::state::{Multisig, Transaction};
// use mockprogram::{instruction as mock_instruction, accounts as mock_accounts, id as mock_program_id};
use crate::utils::*;

pub type PdaInfo<T> = (Pubkey, T);

pub fn find_multisig_pda_pubkey(base: &[u8; 32]) -> Pubkey {
    let (pda, _bump) = Pubkey::find_program_address(
        &[Multisig::SEED_PREFIX, base],
        &multisig_id(),
    );
    pda
}

pub fn get_multisig_pda_data_from_base(program: &Program, base: &[u8; 32]) -> multisig::state::Multisig {
    let multisig_pubkey = find_multisig_pda_pubkey(base);
    let account = program.rpc().get_account(&multisig_pubkey).unwrap();
    multisig::state::Multisig::try_deserialize(&mut account.data.as_slice()).unwrap()
}

pub fn get_multisig_pda_data_from_pubkey(program: &Program, pubkey: &Pubkey) -> multisig::state::Multisig {
    let multisig_pubkey = pubkey;
    let account = program.rpc().get_account(&multisig_pubkey).unwrap();
    multisig::state::Multisig::try_deserialize(&mut account.data.as_slice()).unwrap()
}

pub fn find_new_transaction_pda_pubkey(program: &Program, multisig_base: &String) -> Pubkey {
    let base_key = fmt_base(multisig_base);
    let multisig = get_multisig_pda_data_from_base(program, &base_key);
    let multisig_pubkey = find_multisig_pda_pubkey(&base_key);
    let (pda, _bump) = Pubkey::find_program_address(
        &[Transaction::SEED_PREFIX, multisig_pubkey.key().as_ref(), multisig.transaction_count.to_le_bytes().as_ref() ],
        &multisig_id(),
    );
    println!("new pda {}", pda.to_string());
    pda
}


pub fn find_transaction_pda_pubkey( multisig_base: &String, index: u32) -> Pubkey {
    let base_key = fmt_base(multisig_base);
    let multisig_pubkey = find_multisig_pda_pubkey(&base_key);
    let (pda, _bump) = Pubkey::find_program_address(
        &[Transaction::SEED_PREFIX, multisig_pubkey.key().as_ref(), index.to_le_bytes().as_ref() ],
        &multisig_id(),
    );

    pda
}

pub fn get_transaction_pda_data(program: &Program, multisig_base: &String, index: u32) -> Transaction {
    let base_key = fmt_base(multisig_base);
    let multisig_pubkey = find_multisig_pda_pubkey(&base_key);

    println!("multisig_pubkey_for: {}", multisig_pubkey.to_string());

    let tx_pubkey = find_transaction_pda_pubkey(multisig_base, index);
    println!("tx_pubkey: {}", tx_pubkey.to_string());
    let account = program.rpc().get_account(&tx_pubkey).unwrap();
    multisig::state::Transaction::try_deserialize(&mut account.data.as_slice()).unwrap()
}
