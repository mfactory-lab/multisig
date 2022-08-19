import log from 'loglevel'
import type { CmdContext } from './index'

export async function executeTransactionCmd({ provider, client, opts }: CmdContext) {
  const [multisig] = await client.pda.multisig(opts.multisig)

  const { transaction } = await client.executeTransaction({
    multisig,
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
