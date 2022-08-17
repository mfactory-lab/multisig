import { Buffer } from 'buffer'
import * as fs from 'fs'
import { program as cli } from 'commander'
import log from 'loglevel'
import { AnchorProvider, Program, Wallet, web3 } from '@project-serum/anchor'
import { Keypair } from '@solana/web3.js'
import { MultisigClient } from '@multisig/sdk'
import { version } from '../package.json'
import { clusterUrl } from './utils'

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
    './target/deploy/multisig-keypair.json',
  )
  .option('-l, --log-level <string>', 'log level', (l: any) => {
    l && log.setLevel(l)
  })
  .parseOptions(process.argv)

const opts = cli.opts()

const anchorOpts = AnchorProvider.defaultOptions()
const connection = new web3.Connection(clusterUrl(opts.env), anchorOpts.commitment)
const payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(opts.keypair).toString())))
const provider = new AnchorProvider(connection, new Wallet(payer), anchorOpts)

const client = new MultisigClient({
  program: new Program(MultisigClient.IDL, MultisigClient.programId, provider),
  wallet: provider.wallet,
})

cli.command('show-multisig')
  .argument('<key>', 'Multisig derived key')
  .action(async (key: string) => {
    const multisig = await client.getMultisig(key)
    console.log(JSON.stringify(multisig))
  })

cli.command('create-multisig')
  .requiredOption('-K, --keys <keys>', 'Owner keys separated by comma')
  .requiredOption('-t, --threshold <number>', 'Multisig threshold')
  .option('-k, --key <key>', 'Customize multisig derived key')
  .action(async (opts: any) => {
    const { transaction, key } = await client.createMultisig({
      owners: opts.keys.split(',').map((k: string) => new web3.PublicKey(k)),
      threshold: opts.threshold,
      key: opts.key ?? null,
    })
    try {
      const sig = await provider.sendAndConfirm(transaction)
      log.info(`Key: ${key.toBase58()}`)
      log.info(`Signature: ${sig}`)
      log.info('OK')
    } catch (e) {
      log.info('Error')
      console.log(e)
    }
  })

cli.command('create-transaction')
  .requiredOption('-m, --multisig <string>', 'Multisig derived key')
  .option('-k, --key <key>', 'Customize multisig derived key')
  .action(async (opts: any) => {
    const [multisigKey] = await client.pda.multisig(opts.multisig)

    // TODO:
    const data = ''
    const instruction = new web3.TransactionInstruction({
      programId: client.program.programId,
      keys: [
        {
          pubkey: multisigKey,
          isWritable: true,
          isSigner: true,
        },
      ],
      data,
    } as any)

    const { transaction, key } = await client.createTransaction({
      multisig: multisigKey,
      instructions: [instruction],
    })

    try {
      const sig = await provider.sendAndConfirm(transaction)
      log.info(`Key: ${key.toBase58()}`)
      log.info(`Signature: ${sig}`)
      log.info('OK')
    } catch (e) {
      log.info('Error')
      console.log(e)
    }
  })

cli.command('approve')
  .argument('<index>', 'Transaction index')
  .requiredOption('-m, --multisig <string>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    const [multisigKey] = await client.pda.multisig(opts.multisig)

    const { transaction } = await client.approveTransaction({
      multisig: multisigKey,
      index: Number(index),
    })

    try {
      const sig = await provider.sendAndConfirm(transaction)
      log.info(`Signature: ${sig}`)
      log.info('OK')
    } catch (e) {
      log.info('Error')
      console.log(e)
    }
  })

cli.command('execute')
  .argument('<index>', 'Transaction index')
  .requiredOption('-m, --multisig <string>', 'Multisig key')
  .action(async (index: string, opts: any) => {
    const [multisig] = await client.pda.multisig(opts.multisig)

    const { transaction } = await client.executeTransaction({
      multisig,
      index: Number(index),
    })

    try {
      const sig = await provider.sendAndConfirm(transaction)
      log.info(`Signature: ${sig}`)
      log.info('OK')
    } catch (e) {
      log.info('Error')
      console.log(e)
    }
  })

cli.parse()
