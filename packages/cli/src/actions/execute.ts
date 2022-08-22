import log from 'loglevel'
import { useContext } from '../context'

export async function executeTransactionAction(index: string | number, opts: any) {
  const { provider, client } = useContext()
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
}
