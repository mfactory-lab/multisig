import fs from 'fs'
import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import { inspectTransaction } from '../utils'
import { useContext } from '../context'

export async function createTransactionAction(file: string, opts: any) {
  const { provider, client } = useContext()
  const [multisigKey] = await client.pda.multisig(opts.multisig)

  const instructions = Array.from(JSON.parse(fs.readFileSync(file).toString()))
    .map((i: any) => new web3.TransactionInstruction(i))

  const index = opts.index ?? null

  const { transaction, key } = await client.createTransaction({
    multisig: multisigKey,
    instructions,
    index,
  })

  try {
    const sig = await provider.sendAndConfirm(transaction)
    log.info(`Tx: ${key.toBase58()}`)
    log.info(`Index: ${index}`)
    log.info(`Signature: ${sig}`)
    log.info('OK')
  } catch (e) {
    log.info('Error')
    console.log(e)
  }
}

export async function inspectTransactionAction(index: number, opts: any) {
  const { client, cluster } = useContext()
  const [multisig] = await client.pda.multisig(opts.multisig)
  const transaction = await client.getTransaction(multisig, index)

  if (!transaction) {
    log.error(`Unknown transaction #${index}`)
    return
  }

  const tx = new web3.Transaction()
  tx.feePayer = client.wallet.publicKey
  tx.add(...transaction.instructions)

  const { base64, url } = inspectTransaction(tx, cluster)

  log.info(`Index: ${transaction.index}`)
  log.info(`Signers: ${transaction.signers}`)
  log.info(`Instructions: ${JSON.stringify(transaction.instructions)}`)
  log.info('Encoded Transaction:')
  log.info(`${base64}\n`)
  log.info('Inspection Link:')
  log.info(url)
  log.info('\n')
}

export async function showAllTransactionsAction(opts: any) {
  const { client } = useContext()
  const [multisig] = await client.pda.multisig(opts.multisig)
  const transactions = await client.findTransactions({ multisig, index: opts.index })
  log.info(JSON.stringify(transactions, null, 2))
}

export async function deleteTransactionAction(index: number, opts: any) {
  const { client, cluster } = useContext()
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
