import type { Command } from 'commander'
import { program as cli } from 'commander'
import log from 'loglevel'
import { version } from '../package.json'
import * as actions from './actions'
import { initContext } from './context'

const DEFAULT_LOG_LEVEL = 'info'
const DEFAULT_CLUSTER = 'devnet'
const DEFAULT_KEYPAIR = `${process.env.HOME}/.config/solana/id.json`

cli
  .version(version)
  .allowExcessArguments(false)
  .option('-c, --cluster <CLUSTER>', 'Solana cluster', DEFAULT_CLUSTER)
  .option('-k, --keypair <KEYPAIR>', 'Filepath or URL to a keypair', DEFAULT_KEYPAIR)
  .option('-l, --log-level <LEVEL>', 'Log level', (l: any) => l && log.setLevel(l), DEFAULT_LOG_LEVEL)
  .hook('preAction', async (command: Command) => {
    const opts = command.opts() as any
    log.setLevel(opts.logLevel)
    initContext(opts)
  })

// -------------------------------------------------------
// Multisig
// -------------------------------------------------------

const multisig = cli.command('multisig')

multisig.command('new')
  .description('Create new multisig')
  .requiredOption('-o, --owners <OWNER_KEYS>', 'Owner keys (separated by comma)')
  .requiredOption('-t, --threshold <THRESHOLD>', 'Minimum number of owner approvals needed to sign a transaction')
  .option('--key <base58>', 'Multisig key (default auto-generated)')
  .action(actions.createMultisigAction)

multisig.command('show')
  .argument('<MULTISIG_KEY>')
  .action(actions.showMultisigAction)

multisig.command('show-owned')
  .description('Show all owned multisig accounts')
  .action(actions.showOwnedMultisigAction)

multisig.command('approve')
  .description('Approve all pending transactions')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.approveAllTransactionsAction)

// -------------------------------------------------------
// Transaction
// -------------------------------------------------------

const tx = cli.command('tx')

tx.command('new')
  .description('Create new transaction')
  .argument('<file>', 'Pat to the instructions file')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .option('-i, --index <INDEX>', 'Custom transaction index')
  .action(actions.createTransactionAction)

tx.command('all')
  .description('Show all transactions')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .option('-i, --index <INDEX>', 'Filter by transaction index')
  .action(actions.showAllTransactionsAction)

tx.command('inspect')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.inspectTransactionAction)

tx.command('delete')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.deleteTransactionAction)

tx.command('approve')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.approveTransactionAction)

tx.command('execute')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.executeTransactionAction)

// -------------------------------------------------------
// Predefined transactions
// -------------------------------------------------------

const action = cli.command('action')

action.command('upgrade-program')
  .argument('<PROGRAM_ADDRESS>', 'Address of the program to upgrade')
  .argument('<BUFFER_ADDRESS>', 'Address of the program buffer')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.updateProgramAction)

action.command('set-upgrade-authority')
  .argument('<PROGRAM_ADDRESS>', 'Address of the program to upgrade')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .requiredOption('-nua, --new-upgrade-authority <NEW_UPGRADE_AUTHORITY>', ' Address of the new upgrade authority')
  .action(actions.setUpgradeAuthorityAction)

action.command('transfer-sol')
  .requiredOption('-m, --multisig <MULTISIG_KEY>')
  .action(actions.transferSolAction)

cli.parseAsync(process.argv).then(
  () => {},
  (e: unknown) => {
    throw e
  },
)
