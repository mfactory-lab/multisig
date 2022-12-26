#![feature(slice_pattern)]
use core::slice::SlicePattern;
use std::{rc::Rc, fmt::Debug};
use anchor_lang::{AnchorDeserialize, Key};
use multisig::{
    state::{TxInstruction, TxAccountMeta, Multisig}, 
    instruction as multisig_instruction, 
    accounts as multisig_accounts, 
    id as multisig_id
};
use std::fs::File;
// use mockprogram::{instruction as mock_instruction, accounts as mock_accounts, id as mock_program_id};
pub mod pdas;
pub mod utils;
use utils::*;
use anchor_client::{
    solana_sdk::{
        sysvar::*,
        commitment_config::CommitmentConfig,
        signature::{keypair::Keypair, read_keypair_file},
        pubkey::Pubkey,
        system_instruction::*,
        system_program, signer::Signer,
        native_token::LAMPORTS_PER_SOL, bs58::encode::EncodeTarget,  
        
    },
    
    Client, Cluster, Program, solana_client::rpc_filter::RpcFilterType,
};
use pad::{PadStr, Alignment};

use solana_program::{instruction::{Instruction, AccountMeta}, };
use pdas::{find_new_transaction_pda_pubkey, find_transaction_pda_pubkey};
use hex::*;
use serde::{Deserialize, Serialize};

use crate::pdas::{find_multisig_pda_pubkey, get_multisig_pda_data_from_base, get_multisig_pda_data_from_pubkey};
pub struct MultisigClient {
    pub client: Client,
    pub program: Program,
    pub signer: Keypair,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SolanaConfig {
    pub keypair_path: String,
    pub json_rpc_url: String,
    pub commitment: String,
}
pub struct ClientConfig {
    pub keypair: Keypair,
    pub rpc_url: String,
}

impl MultisigClient {
    pub fn new(config: &SolanaConfig) -> Self {
        let client_config = setup_client_config(config).unwrap();
        let client = setup_client(&client_config).unwrap();
        let program = client.program(multisig_id());
        let signer = client_config.keypair;
        println!("signer_pubkey {}", signer.pubkey());
        Self { client, program, signer }
    }
    pub fn create_multisig(&self, owners: &Vec<Pubkey>, threshold: &u8, base: &Option<String>) {
        // let mock_owners = [Keypair::new(), Keypair::new(), Keypair::new()];
        let base = match base {
            None => Keypair::new().pubkey().to_string(),
            Some(pubkey) => pubkey.clone(),
        };
        let base_arg: [u8; 32] =  fmt_base(&base);
        
        let args = multisig_instruction::CreateMultisig {
            base:base_arg,
            owners: owners.clone(),
            threshold: *threshold,
        };
        let mut builder = self.program
            .request()
            .accounts(multisig_accounts::CreateMultisig {
                multisig: find_multisig_pda_pubkey(&base_arg),
                payer: self.program.payer(),
                system_program: system_program::id()
            })
            .args(args)
            ;
        
        let sig = builder.send().unwrap();

        let multisig_data = pdas::get_multisig_pda_data_from_base(&self.program, &base_arg);

        println!("multisig_base {}", base);
        println!("multisig_address {}", find_multisig_pda_pubkey(&base_arg));
        println!("threshold {}", multisig_data.threshold);
        println!("owners_len {}", multisig_data.owners.len());
    }

    pub fn show_multisig(&self, base: &String) {
        let base_arg: [u8; 32] =  fmt_base(&base);
        let multisig_data = get_multisig_pda_data_from_base(&self.program, &base_arg);
        println!("MULTISIG {}", base);
        println!("Address {}", find_multisig_pda_pubkey(&base_arg));
        println!("Threshold: {}", multisig_data.threshold);
        println!("owners_len {}", multisig_data.owners.len());
        println!("Transaction count: {}", multisig_data.transaction_count);
    }

    pub fn show_owned(&self) {
        let filters: Vec<RpcFilterType> = Vec::new();
        let accounts = self.program.accounts::<multisig::state::Multisig>(filters).unwrap();
        let owner_key = self.program.payer();
        // println!("total account counts: {}", accounts.len());
        let owned_accounts: Vec<(Pubkey, Multisig)> = accounts.into_iter().filter(|(pubkey, data)| {
            match data.owner_index(&owner_key) {
                None => false,
                Some(_) => {
                    println!("key: {} addr: {}", decode_base(&data.base), pubkey);
                    true
                },
            }
        }).collect();
        println!("owned_multisigs count: {}", owned_accounts.len());
        
    }
    pub fn create_transaction(&self, ixs: Vec<Instruction>, multisig_base: &String, index: &Option<u8>) {

        let tx_pubkey = find_new_transaction_pda_pubkey(&self.program, multisig_base);
        let mock_args = multisig_instruction::CreateTransaction {
            instructions: ixs.into_iter().map(|i| {ctix(i)}).collect()
        };
        
        let multisig_pubkey = find_multisig_pda_pubkey(&fmt_base(multisig_base));
        let mut builder = self.program
            .request()
            .accounts(multisig_accounts::CreateTransaction {
                multisig: multisig_pubkey,
                proposer: self.program.payer(),
                system_program: system_program::id(),
                transaction: tx_pubkey,
            })
            .args(mock_args)
            ;
        let sig = builder.send().unwrap();
        println!("tx {} created !!! sig : {}", tx_pubkey, sig);
    }
    pub fn create_transaction_from_file(&self, file: &String, multisig_base: &String, index: &Option<u8>) {
        let raw_str = std::fs::read_to_string(file).unwrap();
        let ixs = serde_json::from_str::<Vec<Instruction>>(&raw_str).unwrap();
        self.create_transaction(ixs, multisig_base, index);
    }
    pub fn approve_transaction(&self, multisig_base: &String, index: u32) {
        let base_key = fmt_base(multisig_base);
        let multisig_pubkey = find_multisig_pda_pubkey(&base_key);
        let tx_pubkey = find_transaction_pda_pubkey( multisig_base, index);
        let payer = self.program.payer();
        let builder = self.program
           .request()
           .accounts(multisig_accounts::Approve {
                transaction: tx_pubkey,
                owner: payer,
                multisig: multisig_pubkey,
           })
           .args(multisig_instruction::Approve{})
           .signer(&self.signer)
           ;
        builder.send().unwrap();
    }
    pub fn execute_transaction(&self, multisig_base: &String, index: u32) {
        let base_key = fmt_base(multisig_base);
        let multisig_pubkey = find_multisig_pda_pubkey(&base_key);
        let tx_pubkey = find_transaction_pda_pubkey(multisig_base, index);
        let payer = self.program.payer();
        println!("payer: {}", payer);
        println!("signer: {}", self.signer.pubkey());
        println!("tx_pubkey: {}", tx_pubkey);
        println!("multisig_pubkey: {}", multisig_pubkey);
        let mut builder = self.program
           .request()
           .accounts(multisig_accounts::ExecuteTransaction {
                transaction: tx_pubkey,
                executor: payer,
                multisig: multisig_pubkey,
                clock: clock::ID,
           })
           .args(multisig_instruction::ExecuteTransaction{})
           .signer(&self.signer)
        ;
        let tx = pdas::get_transaction_pda_data(&self.program, multisig_base, index);
        let multisig = pdas::get_multisig_pda_data_from_pubkey(&self.program, &multisig_pubkey);
        let mut remaining_acounts:Vec<AccountMeta> = Vec::new();
        for ix in tx.instructions {
            // builder = builder.accounts(AccountMeta {
            //     is_signer: false,
            //     is_writable: false,
            //     pubkey: ix.program_id
            // });
            remaining_acounts.push(AccountMeta {
                is_signer: false,
                is_writable: false,
                pubkey: ix.program_id
            });
            
            for k in ix.keys {
                remaining_acounts.push(AccountMeta {
                    is_signer: false,
                    is_writable: k.is_writable,
                    pubkey: k.pubkey
                });
            }
        }
        for owner in multisig.owners {
            // builder = builder.accounts(AccountMeta {
            //     is_signer: false,
            //     is_writable: false,
            //     pubkey: owner
            // });
            remaining_acounts.push(AccountMeta {
                is_signer: false,
                is_writable: true,
                pubkey: owner
            })
        }

        builder = builder.accounts(remaining_acounts);
        let sig = builder.send().unwrap();
        println!("tx {} created !!! sig : {}", tx_pubkey, sig);
        
    }

    pub fn inspect_transaction(&self, multisig_base: &String, index: &u32) {
        let tx = pdas::get_transaction_pda_data(&self.program, &multisig_base, *index);
        let multisig_base = fmt_base(multisig_base);
        let multisig = pdas::get_multisig_pda_data_from_base(&self.program, &multisig_base);

        println!("Index: {}", index);
        // println!("Signers: {}", tx.signers);
        let decoded_tx: Vec<Instruction> = tx.instructions.into_iter().map(
            |i| {
                deserialize_instruction(i)
            }
        ).collect();
        println!("executor: {}", tx.executor);
        match tx.executed_at {
            None => println!("status: not_executed_yet"),
            Some(t) => println!("status: executed_at_{}", t),
        };
        println!("Instructions: {}", serde_json::to_string(
            &decoded_tx
        ).unwrap());
        println!("Signers : ");
        for i in 0..(&multisig.owners.len()-1) {
            if tx.signers[i] == true {
                println!("approved owner: {}", multisig.owners[i].key());

            }
        }

    }


    pub fn show_all_tx(&self, multisig_base: &String) {
        let filters: Vec<RpcFilterType> = Vec::new();
        let accounts = self.program.accounts::<multisig::state::Transaction>(filters).unwrap();
        // println!("total account counts: {}", accounts.len());
        for (pubkey, data) in &accounts {
            println!("index: {}, tx: {}", data.index, pubkey);
        }
        println!("tx counts: {}", &accounts.len());
        
    }

    pub fn transfer_sol(&self, multisig_base: &String) {

    }
    pub fn create_mock_ix_file(&self) {
        let ixs = [
                transfer(&self.program.payer(), &Keypair::new().pubkey(), LAMPORTS_PER_SOL),
                transfer(&self.program.payer(), &Keypair::new().pubkey(), LAMPORTS_PER_SOL),
                transfer(&self.program.payer(), &Keypair::new().pubkey(), LAMPORTS_PER_SOL),
            ];
        std::fs::write(
            "./mock_ixs.json",
            serde_json::to_string(&ixs).unwrap()
    );
}
}

pub fn ctix(i: Instruction) -> TxInstruction {
    TxInstruction {
        program_id: i.program_id,
        data: i.data,
        keys: i.accounts.into_iter().map(|a| {ctam(a)}).collect()
    }
}
pub fn deserialize_instruction(i: TxInstruction) -> Instruction {
    Instruction {
        program_id: i.program_id,
        data: i.data,
        accounts: i.keys.into_iter().map(|a| {decode_account_meta(a)}).collect()
    }
}

pub fn decode_account_meta(a: TxAccountMeta) -> AccountMeta {
    AccountMeta { pubkey: a.pubkey, is_signer: a.is_signer, is_writable: a.is_writable }
}

pub fn ctam(i: AccountMeta) -> TxAccountMeta {
    TxAccountMeta { pubkey: i.pubkey, is_signer: i.is_signer, is_writable: i.is_writable }
}

pub fn setup_client(config: &ClientConfig) -> Result<Client, String> {
    let rpc_url: String = config.rpc_url.clone();
    let ws_url: String = rpc_url.replace("http", "ws");

    let cluster = Cluster::Custom(rpc_url, ws_url);

    let key_bytes = config.keypair.to_bytes();
    let signer = Rc::new(Keypair::from_bytes(&key_bytes).unwrap());

    let opts = CommitmentConfig::confirmed();
    Ok(Client::new_with_options(cluster, signer, opts))
}

pub fn setup_client_config(config: &SolanaConfig) -> Result<ClientConfig, String> {

    let keypair = read_keypair_file(&config.keypair_path).unwrap();
    let rpc_url = config.json_rpc_url.clone();
    Ok(ClientConfig { rpc_url, keypair })
}
