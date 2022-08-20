import { Buffer } from 'buffer'
import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import { useContext } from '../context'

const BPF_UPGRADE_LOADER_ID = new web3.PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111',
)

interface Opts {
  index: number
  multisig: string
  programId: string
  bufferAddr: string
}

export async function updateProgramAction(opts: Opts) {
  const { provider, client } = useContext()
  const programId = new web3.PublicKey(opts.programId)
  const bufferAddr = new web3.PublicKey(opts.bufferAddr)

  const programAccount = await provider.connection.getAccountInfo(programId)
  if (programAccount === null) {
    throw new Error(`Unknown program ${programId}`)
  }

  const spillAddr = client.wallet.publicKey
  const programDataAddr = new web3.PublicKey(programAccount.data.slice(4))
  const [multisigKey] = await client.pda.multisig(opts.multisig)
  const [authority] = await client.pda.multisigSigner(multisigKey)

  log.info(`Multisig key: ${multisigKey}`)
  log.info(`Authority key: ${authority}`)

  const keys = [
    { pubkey: authority, isWritable: authority, isSigner: false },
    { pubkey: programId, isWritable: true, isSigner: false },
    { pubkey: programDataAddr, isWritable: true, isSigner: false },
    { pubkey: bufferAddr, isWritable: true, isSigner: false },
    { pubkey: spillAddr, isWritable: true, isSigner: true },
    { pubkey: web3.SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
    { pubkey: web3.SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false },
  ] as any

  const { transaction, key } = await client.createTransaction({
    multisig: multisigKey,
    instructions: [
      new web3.TransactionInstruction({
        programId: BPF_UPGRADE_LOADER_ID,
        keys,
        data: Buffer.from([3, 0, 0, 0]),
      }),
    ],
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
