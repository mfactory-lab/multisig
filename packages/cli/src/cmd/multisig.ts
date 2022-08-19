import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import type { CmdContext } from './index'

export async function createMultisigCmd({ provider, client, opts }: CmdContext) {
  const owners = new Set(opts.keys.split(','))

  owners.add(client.wallet.publicKey.toBase58())

  const { transaction, key } = await client.createMultisig({
    owners: [...owners].map(k => new web3.PublicKey(k as string)),
    threshold: Number(opts.threshold),
    key: opts.key ?? null,
  })

  const [multisigKey] = await client.pda.multisig(key)
  const [signer] = await client.pda.signer(multisigKey)

  try {
    await provider.sendAndConfirm(transaction)
    log.info(`Multisig Key: ${key.toBase58()}`)
    log.info(`Multisig Address: ${multisigKey.toBase58()}`)
    log.info(`Signer Address: ${signer.toBase58()}`)
    log.info('OK')
  } catch (e) {
    log.info('Error')
    console.log(e)
  }
}
