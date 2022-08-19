import log from 'loglevel'
import type { CmdContext } from './index'

export async function approveTransactionCmd({ provider, client, opts }: CmdContext) {
  const [multisigKey] = await client.pda.multisig(opts.multisig)

  const { transaction } = await client.approveTransaction({
    multisig: multisigKey,
    index: Number(opts.index),
  })

  try {
    const sig = await provider.sendAndConfirm(transaction)
    log.info(`Signature: ${sig}`)
    log.info('OK')
  } catch (e) {
    log.info('Error')
    console.log(e)
  }
}

export async function approveAllTransactionsCmd({ provider, client, opts }: CmdContext) {
  const [multisig] = await client.pda.multisig(opts.multisig)
  const transactions = await client.findTransactions({ multisig })

  log.info(`Found ${transactions.length} transaction(s)...`)

  let approved = 0
  for (const { account } of transactions) {
    if (!account.executedAt) {
      log.info(`Approving transaction #${account.index}...`)
      try {
        const { transaction } = await client.approveTransaction({
          multisig,
          index: Number(account.index),
        })
        const sig = await provider.sendAndConfirm(transaction)
        log.info(`Signature: ${sig}`)
        log.info('OK')
        approved++
      } catch (e) {
        log.info('Error')
        console.log(e)
      }
    }
  }

  if (transactions.length > 0) {
    log.info(`Total approved: ${approved}`)
  }
}
