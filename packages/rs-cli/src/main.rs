use clap::Parser;
use rs_cli::cli::*;
// use rs_cli::actions::handle_action;
fn main() {
    let cli = Cli::parse();
    cli.handle_cli();
    
}