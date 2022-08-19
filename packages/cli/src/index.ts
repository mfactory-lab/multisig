import { Buffer } from 'buffer'
import * as fs from 'fs'
import { program as cli } from 'commander'
import log from 'loglevel'
import { AnchorProvider, Program, Wallet, web3 } from '@project-serum/anchor'
import { Keypair } from '@solana/web3.js'
import { MultisigClient } from '@multisig/sdk'
import { version } from '../package.json'
import { clusterUrl } from './utils'
import {
  approveAllTransactionsCmd,
  approveTransactionCmd,
  createMultisigCmd,
  createTransactionCmd,
  deleteTransactionCmd,
  executeTransactionCmd,
  showAllTransactionsCmd,
  showTransactionCmd,
  upgradeProgramCmd,
} from './cmd'

log.setLevel('info')

cli
  .version(version)
  .option<web3.Cluster>(
    '-e, --env <string>',
    'Solana cluster env name',
    c => c as web3.Cluster,
    'devnet',
  )
  .option(
    '-k, --keypair <file>',
    'Solana wallet location',
    `${process.env.HOME}/.config/solana/id.json`,
  )
  .option('-l, --log-level <string>', 'log level', (l: any) => l && log.setLevel(l))
  .parseOptions(process.argv)

const opts = cli.opts()

const cluster = opts.env
const anchorOpts = AnchorProvider.defaultOptions()
const connection = new web3.Connection(clusterUrl(cluster), anchorOpts.commitment)
const wallet = new Wallet(Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(opts.keypair).toString()))))
const provider = new AnchorProvider(connection, wallet, anchorOpts)

const client = new MultisigClient({
  program: new Program(MultisigClient.IDL, MultisigClient.programId, provider),
  wallet: provider.wallet,
})

cli.command('create-multisig')
  .description('Create new multisig')
  .requiredOption('--keys <keys>', 'Owner keys (separated by comma)')
  .requiredOption('-t, --threshold <number>', 'Minimum number of owner approvals needed to sign a transaction')
  .option('-k, --key <base58>', 'Multisig key (default auto-generated)')
  .action(async (opts: any) => {
    return createMultisigCmd({ provider, client, opts })
  })

cli.command('show-multisig')
  .argument('<key>', 'Multisig key')
  .action(async (key: string) => {
    const multisig = await client.getMultisig(key)
    console.log(JSON.stringify(multisig, null, 2))
  })

cli.command('show-owned-multisig')
  .description('Show all owned multisig accounts')
  .action(async () => {
    const list = await client.findMultisigByOwner(client.wallet.publicKey)
    log.info(JSON.stringify(list, null, 2))
  })

cli.command('new-transaction')
  .argument('<file>', 'Instructions file')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .option('-i, --index <number>', 'Custom transaction index')
  .action(async (file, opts: any) => {
    return createTransactionCmd({ provider, client, opts: { ...opts, file } })
  })

cli.command('transactions')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .requiredOption('-i, --index <numbder>', 'Transaction index')
  .action(async (opts: any) => {
    return showAllTransactionsCmd({ provider, client, opts })
  })

cli.command('tx')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: number, opts: any) => {
    return showTransactionCmd({ provider, client, opts: { ...opts, index } })
  })

cli.command('upgrade-program')
  .argument('<key>', 'Program id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (programId, opts: any) => {
    return upgradeProgramCmd({ provider, client, opts: { ...opts, programId } })
  })

cli.command('delete-transaction')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action((index: number, opts: any) => {
    return deleteTransactionCmd({ provider, client, opts: { ...opts, index } })
  })

cli.command('approve')
  .argument('<index>', 'Transaction id')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return approveTransactionCmd({ provider, client, opts: { ...opts, index } })
  })

cli.command('approve-all')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (opts: any) => {
    return approveAllTransactionsCmd({ provider, client, opts })
  })

cli.command('execute')
  .argument('<index>', 'Transaction index')
  .requiredOption('-m, --multisig <key>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    return executeTransactionCmd({ provider, client, opts: { ...opts, index } })
  })

cli.parse()
