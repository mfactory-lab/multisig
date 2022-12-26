
use clap:: {
    Args,
    Parser,
    Subcommand
};
use super::action::*;
use super::multisig::*;
use super::tx::*;
use console::style;
use std::io::Read;
use std::{env, fs, fs::File, path::Path};
use rs_sdk::{SolanaConfig, MultisigClient};

#[derive(Parser)]
#[clap(author, version, about)]
pub struct Cli {
    /// Solana cluster 
    #[arg(short, long, default_value="devnet")]
    pub cluster: Option<String>,
    /// Filepath or URL to a keypair 
    #[arg(short, long, default_value="~/.config/solana/id.json")]
    pub keypair: Option<String>,
    /// Log level (default: "info")
    #[arg(short, long, default_value="info")]
    pub log_level: Option<String>,
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    // #[clap(name="multisig")]
    Multisig {
        #[command(subcommand)]
        multisig_commands: MultisigCommands,
    },
    Tx {
        #[command(subcommand)]
        tx_commands: TxCommands,
    },
    Action {
        #[command(subcommand)]
        action_commands: ActionCommands,
    },
}

impl Cli {
    pub fn get_solana_config(&self) -> SolanaConfig {
        // get default solana config rpc_url and keypair path.
        
        let default_sol_config = get_default_solana_config().unwrap();
        default_sol_config
    }
    pub fn handle_cli(&self) -> Result<(), String> {
        // get solana config from args
        let config = self.get_solana_config();
        // merge solana config with default solana config
        let multisig_client = MultisigClient::new(&config);
        match &self.command {
            Commands::Multisig {multisig_commands} => {
                multisig_commands.handle_multisig(multisig_client);
            }
            Commands::Tx {tx_commands} => {
                tx_commands.handle_tx(multisig_client);
            }
            Commands::Action {action_commands} => {
                action_commands.handle_action(multisig_client);
            }
        }

        Ok(())
    }
}

// TODO - consider moving this into utility module
/// Gets default solana configuration (keypair_path, rpc_url)
pub fn get_default_solana_config() -> Option<SolanaConfig> {
    // TODO - error if solana not installed

    // TODO - convert ~ to /home/${username}
    // let config_path_str = "~/.config/solana/cli/config.yml";
    let home = if cfg!(unix) {
        env::var_os("HOME").expect("Couldn't find UNIX home key.")
    } else if cfg!(windows) {
        let drive = env::var_os("HOMEDRIVE").expect("Couldn't find Windows home drive key.");
        let path = env::var_os("HOMEPATH").expect("Couldn't find Windows home path key.");
        Path::new(&drive).join(&path).as_os_str().to_owned()
    } else if cfg!(target_os = "macos") {
        env::var_os("HOME").expect("Couldn't find MacOS home key.")
    } else {
        panic!("Unsupported OS!");
    };

    // TODO - need to make this code work
    let config_path = Path::new(&home)
        .join(".config")
        .join("solana")
        .join("cli")
        .join("config.yml");

    let mut conf_file = match File::open("/home/earth/.config/solana/cli/config.yml") {
        Ok(f) => f,
        Err(e) => {
            println!(
                "{} {}",
                style("Failed to open Solana config file:").bold().red(),
                style(e).bold().red(),
            );
            /// if solana not installed, exit the process
            std::process::exit(1);
        }
    };

    let config: Option<SolanaConfig> = serde_yaml::from_reader(&conf_file).expect("Could not read from the yaml");

    return config;
}