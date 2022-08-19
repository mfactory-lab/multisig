import type { Command } from 'commander'
import { program as cli } from 'commander'
import log from 'loglevel'
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
  .hook('preAction', async (command: Command) => initContext(command.opts()))

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
    console.log(JSON.stringify(multisig, null, 2))
  })

multisig.command('show-owned')
  .description('Show all owned multisig accounts')
  .action(async () => {
    const { client } = useContext()
    const list = await client.findMultisigByOwner(client.wallet.publicKey)
    log.info(JSON.stringify(list, null, 2))
  })

multisig.command('approve')
  .description('Approve all pending transactions')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (opts: any) => {
    return actions.approveAllTransactionsAction(opts)
  })

const tx = cli.command('tx')

tx.command('new')
  .argument('<file>', 'Instructions file')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .option('-i, --index <number>', 'Custom transaction index')
  .action(async (file, opts: any) => {
    return actions.createTransactionAction({ ...opts, file })
  })

tx.command('all')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .requiredOption('-i, --index <numbder>', 'Transaction index')
  .action(actions.showAllTransactionsAction)

tx.command('inspect')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: number, opts: any) => {
    return actions.showTransactionAction({ ...opts, index })
  })

tx.command('delete')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action((index: number, opts: any) => {
    return actions.deleteTransactionAction({ ...opts, index })
  })

tx.command('approve')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return actions.approveTransactionAction({ ...opts, index })
  })

tx.command('execute')
  .argument('<index>', 'Transaction index')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return actions.executeTransactionAction({ ...opts, index })
  })

const action = cli.command('action')

action.command('upgrade-program')
  .argument('<key>', 'Program id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (programId, opts: any) => {
    return actions.updateProgramAction({ ...opts, programId })
  })

cli.parseAsync(process.argv).then(
  () => {},
  (e: unknown) => {
    throw e
  },
)
