use clap:: {
    Args,
    Parser,
    Subcommand
};
use rs_sdk::{MultisigClient};
#[derive(Subcommand)]
pub enum ActionCommands {
    /// <PROGRAM_ADDRESS> <BUFFER_ADDRESS>
    UpgradeProgram,
    /// <PROGRAM_ADDRESS>
    SetUpgradeAuthority,
    TransferSol,
}


impl ActionCommands {
    pub fn handle_action(&self, multisig_client: MultisigClient) -> Result<(), String> {
    
        match &self {
            ActionCommands::UpgradeProgram => {
                println!("action upgrade_program ");
            }
            ActionCommands::SetUpgradeAuthority => {
                println!("action set_upgrade_authority:");
            }
            ActionCommands::TransferSol => {
                println!("action transfer_sol:");
            }
    
        };
        Ok(())
    }
}


