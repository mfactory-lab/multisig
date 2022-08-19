import log from 'loglevel'
import { web3 } from '@project-serum/anchor'
import { useContext } from '../context'

export async function transferSolAction(opts: any) {
  const { client, provider } = useContext()
  const [multisigKey] = await client.pda.multisig(opts.multisig)
  const [signer] = await client.pda.signer(multisigKey)

  const instruction = web3.SystemProgram.transfer({
    fromPubkey: signer,
    toPubkey: new web3.PublicKey('8sefnFBiNpsbZijpuf6S2TFb3wT5d2o2o3uPFpGrMLGE'),
    lamports: web3.LAMPORTS_PER_SOL,
  })

  const { transaction, key } = await client.createTransaction({
    multisig: multisigKey,
    instructions: [instruction],
    index: opts.index ?? null,
  })

  try {
    const sig = await provider.sendAndConfirm(transaction)
    log.info(`Tx: ${key.toBase58()}`)
    log.info(`Signature: ${sig}`)
    log.info('OK')
  } catch (e) {
    log.info('Error')
    console.log(e)
  }
}
