use std::str::FromStr;

use clap:: {
    Parser,
    Subcommand
};                        
use rs_sdk::{MultisigClient, SolanaConfig};       
use anchor_client::{solana_sdk::pubkey::Pubkey};

#[derive(Parser)]
pub struct Multisig {
    #[command(subcommand)]
    pub multisig_commands: MultisigCommands,
}
#[derive(Subcommand)]
pub enum MultisigCommands {
    /// Create new multisig
    New {
        /// Owner keys (separated by comma)
        #[arg(short, long)]
        owners: String,
        /// Minimum number of owner approvals needed to sign a transaction
        #[arg(short, long)]
        threshold: u8,
        /// Base key (default: random 32 bytes)
        #[arg(short, long)]
        base: Option<String>,
    },
    Show {
        multisig_base: String,
    },
    /// Show all owned multisig accounts
    ShowOwned,
    /// Approve all pending transactions
    Approve,
}

impl MultisigCommands {
    pub fn handle_multisig(&self, multisig_client: MultisigClient) -> Result<(), String> {
        
        match &self{
            MultisigCommands::New {owners, threshold, base}  => {
                let owners_pubkey: Vec<Pubkey> = owners.split(",").map(|s| {
                    Pubkey::from_str(s).unwrap()
                }).collect();
                multisig_client.create_multisig(&owners_pubkey, threshold, base);
            }
            MultisigCommands::Show{multisig_base} => {
                multisig_client.show_multisig(multisig_base);
            }
            MultisigCommands::ShowOwned => {
                multisig_client.show_owned();
                println!("multisig show:");
            }
            MultisigCommands::Approve => {
                println!("multisig approve:");
            }
            
        };
        Ok(())
    }    
}

