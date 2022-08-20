import type { Command } from 'commander'
import { program as cli } from 'commander'
import log from 'loglevel'
import chalk from 'chalk'
import { version } from '../package.json'
import * as actions from './actions'
import { initContext, useContext } from './context'

const DEFAULT_LOG_LEVEL = 'info'
const DEFAULT_CLUSTER = 'devnet'
const DEFAULT_KEYPAIR = `${process.env.HOME}/.config/solana/id.json`

cli
  .version(version)
  .allowExcessArguments(false)
  .option('-c, --cluster <cluster>', 'Solana cluster', DEFAULT_CLUSTER)
  .option('-k, --keypair <keypair>', 'Wallet keypair', DEFAULT_KEYPAIR)
  .option('-l, --log-level <string>', 'Log level', (l: any) => l && log.setLevel(l), DEFAULT_LOG_LEVEL)
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
  .requiredOption('-o, --owners <keys>', 'Owner keys (separated by comma)')
  .requiredOption('-t, --threshold <number>', 'Minimum number of owner approvals needed to sign a transaction')
  .option('--key <base58>', 'Multisig key (default auto-generated)')
  .action(actions.createMultisigAction)

multisig.command('show')
  .argument('<key>', 'Multisig key')
  .action(async (key: string) => {
    const { client } = useContext()
    const multisig = await client.getMultisig(key)
    console.log(chalk.bgMagenta(JSON.stringify(multisig, null, 2)))
  })

multisig.command('show-owned')
  .description('Show all owned multisig accounts')
  .action(async () => {
    const { client } = useContext()
    const list = await client.findOwnedMultisig(client.wallet.publicKey)
    log.info(JSON.stringify(list, null, 2))
  })

multisig.command('approve')
  .description('Approve all pending transactions')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(actions.approveAllTransactionsAction)

// -------------------------------------------------------
// Transaction
// -------------------------------------------------------

const tx = cli.command('tx')

tx.command('new')
  .description('Create new transaction')
  .argument('<file>', 'Pat to the instructions file')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .option('-i, --index <number>', 'Custom transaction index')
  .action(async (file, opts: any) => {
    return actions.createTransactionAction({ ...opts, file })
  })

tx.command('all')
  .description('Show all transactions')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .option('-i, --index <number>', 'Filter by transaction index')
  .action(actions.showAllTransactionsAction)

tx.command('inspect')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: number, opts: any) => {
    return actions.showTransactionAction({ ...opts, index })
  })

tx.command('delete')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action((index: number, opts: any) => {
    return actions.deleteTransactionAction({ ...opts, index })
  })

tx.command('approve')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return actions.approveTransactionAction({ ...opts, index })
  })

tx.command('execute')
  .argument('<id>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return actions.executeTransactionAction({ ...opts, index })
  })

// -------------------------------------------------------
// Predefined transactions
// -------------------------------------------------------

const action = cli.command('action')

action.command('upgrade-program')
  .argument('<key>', 'Program id')
  .argument('<buffer>', 'Program buffer key')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .option('-i, --index <number>', 'Custom transaction index')
  .action(async (programId, bufferAddr, opts: any) => {
    return actions.updateProgramAction({ ...opts, programId, bufferAddr })
  })

action.command('transfer')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(actions.transferSolAction)

cli.parseAsync(process.argv).then(
  () => {},
  (e: unknown) => {
    throw e
  },
)
