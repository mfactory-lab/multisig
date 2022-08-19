import fs from 'fs'
import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import { inspectTransaction } from '../utils'
import type { CmdContext } from './index'

export async function createTransactionCmd({ provider, client, opts }: CmdContext) {
  const [multisigKey] = await client.pda.multisig(opts.multisig)

  const instructions = Array.from(JSON.parse(fs.readFileSync(opts.keypair).toString()))
    .map((i: any) => new web3.TransactionInstruction(i))

  const { transaction, key } = await client.createTransaction({
    multisig: multisigKey,
    instructions,
    index: opts.index ?? null,
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
}

export async function showTransactionCmd({ client, opts }: CmdContext) {
  const { cluster, index } = opts

  const [multisig] = await client.pda.multisig(opts.multisig)
  const transaction = await client.getTransaction(multisig, index)

  const tx = new web3.Transaction()
  tx.feePayer = client.wallet.publicKey
  tx.add(...transaction.instructions)

  const { base64, url } = inspectTransaction(tx, cluster)

  log.info('Encoded Transaction Message:')
  log.info(`${base64}\n`)
  log.info('Inspection Link:')
  log.info(url)
}

export async function showAllTransactionsCmd({ client, opts }: CmdContext) {
  const [multisig] = await client.pda.multisig(opts.multisig)
  const transactions = await client.findTransactions({ multisig, index: opts.index })
  log.info(JSON.stringify(transactions, null, 2))
}

export async function deleteTransactionCmd({ client, opts }: CmdContext) {
  const { cluster, index } = opts

  const [multisig] = await client.pda.multisig(opts.multisig)
  const transaction = await client.getTransaction(multisig, index)

  const tx = new web3.Transaction()
  tx.feePayer = client.wallet.publicKey
  tx.add(...transaction.instructions)

  const { base64, url } = inspectTransaction(tx, cluster)

  log.info('Encoded Transaction Message:')
  log.info(`${base64}\n`)
  log.info('Inspection Link:')
  log.info(url)
}
