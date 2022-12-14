import { Buffer } from 'buffer'
import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import { useContext } from '../context'
import { inspectTransactionAction } from './transaction'

const BPF_UPGRADE_LOADER_ID = new web3.PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')

interface Opts {
  multisig: string
  index: number
  spillAddr?: string
}

export async function updateProgramAction(programId: string, bufferKey: string, opts: Opts) {
  const { provider, client } = useContext()

  const program = new web3.PublicKey(programId)
  const buffer = new web3.PublicKey(bufferKey)

  // const programAccount = await provider.connection.getAccountInfo(programId)
  // if (programAccount === null) {
  //   throw new Error(`Unknown program ${programId}`)
  // }
  // const programDataKey = new web3.PublicKey(programAccount.data.slice(4))

  const [programDataKey] = await web3.PublicKey.findProgramAddress(
    [program.toBuffer()],
    BPF_UPGRADE_LOADER_ID,
  )

  const [multisig] = await client.pda.multisig(opts.multisig)
  const [authority] = await client.pda.multisigSigner(multisig)

  const spill = opts.spillAddr ? new web3.PublicKey(opts.spillAddr) : authority

  const instruction = new web3.TransactionInstruction({
    keys: [
      { pubkey: programDataKey, isWritable: true, isSigner: false },
      { pubkey: program, isWritable: true, isSigner: false },
      { pubkey: buffer, isWritable: true, isSigner: false },
      { pubkey: spill, isWritable: true, isSigner: false },
      { pubkey: web3.SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: web3.SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
      { pubkey: authority, isWritable: false, isSigner: true },
    ] as any,
    programId: BPF_UPGRADE_LOADER_ID,
    data: Buffer.from([3, 0, 0, 0]),
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
