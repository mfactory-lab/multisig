import { Buffer } from 'buffer'
import type { Address } from '@project-serum/anchor'
import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import { useContext } from '../context'
import { inspectTransactionAction } from './transaction'

const BPF_UPGRADE_LOADER_ID = new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')

interface Opts {
  multisig: string
  newUpgradeAuthority: Address
}

export async function setUpgradeAuthorityAction(programId: string, opts: Opts) {
  const { provider, client } = useContext()

  const program = new web3.PublicKey(programId)
  const newAuthority = new web3.PublicKey(opts.newUpgradeAuthority)

  const [programDataKey] = await web3.PublicKey.findProgramAddress(
    [program.toBuffer()],
    BPF_UPGRADE_LOADER_ID,
  )

  const [multisig] = await client.pda.multisig(opts.multisig)
  const [authority] = await client.pda.multisigSigner(multisig)

  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: programDataKey, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: newAuthority, isSigner: false, isWritable: false },
    ] as any,
    programId: BPF_UPGRADE_LOADER_ID,
    data: Buffer.from([4, 0, 0, 0]),
  })

  const { transaction, index } = await client.createTransaction({
    multisig,
    instructions: [instruction],
  })

  try {
    const sig = await provider.sendAndConfirm(transaction)
    log.info(`OK! Signature: ${sig}`)
  } catch (e) {
    log.info('Error')
    console.log(e)
  }

  await inspectTransactionAction(index, opts)
}
