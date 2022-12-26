use clap:: {
    Args,
    Parser,
    Subcommand
};
use rs_sdk::{MultisigClient};
#[derive(Subcommand)]
pub enum TxCommands {
    /// Create new transaction
    New {
        file: String,
        #[arg(short, long)]
        multisig: String,
        #[arg(short, long)]
        index: Option<u8>,
    },
    /// Show all transactions
    All {
        multisig: String,
    },
    Inspect {
        #[arg(short, long)]
        multisig: String,
        index: u32,
    },
    Delete {
        #[arg(short, long)]
        multisig: String,
        #[arg(short, long)]
        index: u32,
    },
    Approve {
        #[arg(short, long)]
        multisig: String,
        index: u32,
    },
    Execute {
        #[arg(short, long)]
        multisig: String,
        index: u32,
    },
}

impl TxCommands {
    pub fn handle_tx(&self, multisig_client: MultisigClient) -> Result<(), String> {
        
        match &self {
            TxCommands::New {file, multisig, index} => {
                multisig_client.create_mock_ix_file();
                // read ins from file

                multisig_client.create_transaction_from_file(file, multisig, index);
            }
            TxCommands::All {multisig}=> {
                multisig_client.show_all_tx(multisig);
            }
            TxCommands::Inspect {multisig, index}=> {
                multisig_client.inspect_transaction(multisig, index);
                println!("multisig inspect:");
            }
            TxCommands::Delete { multisig, index}=> {
                println!("multisig delete:");
            }

            TxCommands::Approve { multisig, index} => {
                multisig_client.approve_transaction(multisig, *index);

            }

            TxCommands::Execute { multisig, index} => {
                multisig_client.execute_transaction(multisig, *index)
            }
        };
        Ok(())
    }

}