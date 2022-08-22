import { web3 } from '@project-serum/anchor'
import log from 'loglevel'
import chalk from 'chalk'
import { useContext } from '../context'

export async function createMultisigAction(opts: any) {
  const { provider, client } = useContext()

  const owners = new Set<string>(opts.keys.split(',')).add(client.wallet.publicKey.toBase58())

  const { transaction, key } = await client.createMultisig({
    owners: [...owners].map(k => new web3.PublicKey(k)),
    threshold: Number(opts.threshold),
    key: opts.key ?? null,
  })

  const [multisigKey] = await client.pda.multisig(key)
  const [signer] = await client.pda.multisigSigner(multisigKey)

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

export async function showMultisigAction(key: string) {
  const { client } = useContext()
  const multisig = await client.getMultisig(key)

  const [multisigKey] = await client.pda.multisig(multisig.key)
  const [signer] = await client.pda.multisigSigner(multisigKey)

  log.info(chalk.cyan('--------------------------------------------------------------------------'))
  log.info(chalk.cyan(`MULTISIG: ${multisig.key.toBase58()}`))
  log.info(chalk.cyan(`Address: ${multisigKey}`))
  log.info(chalk.cyan(`Signer: ${signer.toBase58()}`))
  log.info(chalk.cyan('--------------------------------------------------------------------------'))

  log.info(chalk.yellow(`\nOwners: \n${multisig.owners.map(o => o.toBase58()).join('\n')}\n`))

  log.info(chalk.dim(`Threshold: ${multisig.threshold}`))
  log.info(chalk.dim(`Transaction count: ${multisig.transactionCount}`))
  log.info(chalk.dim(`Owner Set Sequence Number: ${multisig.ownerSetSeqno}`))

  // console.log(chalk.bgMagenta(JSON.stringify(multisig, null, 2)))
}

export async function showOwnedMultisigAction() {
  const { client } = useContext()
  const list = await client.findOwnedMultisig(client.wallet.publicKey)
  log.info(JSON.stringify(list, null, 2))
}
