import { AnchorProvider, Program, Wallet, web3 } from '@project-serum/anchor'
import { assert } from 'chai'
import { MultisigClient } from '../packages/multisig/src'
import { IDL } from '../packages/multisig/src/idl'

const opts = AnchorProvider.defaultOptions()
const provider = new AnchorProvider(
  new web3.Connection('http://localhost:8899', opts.preflightCommitment),
  new Wallet(web3.Keypair.generate()),
  AnchorProvider.defaultOptions(),
)

describe('multisig', () => {
  const client = new MultisigClient({
    program: new Program(IDL, MultisigClient.programId, provider),
    wallet: provider.wallet,
  })

  const ownerA = web3.Keypair.generate()
  const ownerB = web3.Keypair.generate()
  const ownerC = web3.Keypair.generate()
  const ownerD = web3.Keypair.generate()
  const owners = [client.wallet.publicKey, ownerA.publicKey, ownerB.publicKey, ownerC.publicKey]

  let multisigKey: web3.PublicKey

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(client.wallet.publicKey, 10 * web3.LAMPORTS_PER_SOL),
    )
  })

  it('can create multisig', async () => {
    const threshold = 2
    const { transaction, key } = await client.createMultisig({ owners, threshold })
    await provider.sendAndConfirm(transaction)

    multisigKey = (await client.pda.multisig(key))[0]

    const multisig = await client.fetchMultisig(multisigKey)
    if (!multisig) {
      throw new Error('Invalid multisig')
    }

    assert.equal(multisig.threshold, threshold)
    assert.deepStrictEqual(multisig.owners, owners)
    assert.ok(multisig.ownerSetSeqno === 0)
  })

  it('can create transaction', async () => {
    const newOwners = [client.wallet.publicKey, ownerA.publicKey, ownerB.publicKey, ownerD.publicKey]
    const data = client.program.coder.instruction.encode('set_owners', {
      owners: newOwners,
    })

    const index = 0
    const instruction = new web3.TransactionInstruction({
      programId: client.program.programId,
      keys: [
        {
          pubkey: multisigKey,
          isWritable: true,
          isSigner: true,
        },
      ],
      data,
    } as any)

    const { transaction } = await client.createTransaction({
      multisig: multisigKey,
      instructions: [instruction],
      index,
    })

    try {
      await provider.sendAndConfirm(transaction)
    } catch (e) {
      console.log(e)
      throw e
    }

    const tx = await client.getTransaction(multisigKey, index)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.index, 0)
    assert.equal(tx.proposer.toBase58(), client.wallet.publicKey.toBase58())
    assert.deepEqual(tx.instructions, [instruction])
    assert.equal(tx.signers.length, owners.length)
    assert.equal(tx.signers[0], true)
  })

  it('can not execute unapproved transaction', async () => {
    const index = 0
    const { transaction } = await client.executeTransaction({
      multisig: multisigKey,
      index,
    })
    try {
      await provider.sendAndConfirm(transaction)
      assert.ok(false)
    } catch (e: any) {
      assertErrorCode(e, 'NotEnoughSigners')
    }
  })

  it('can approve transaction', async () => {
    const { transaction } = await client.approveTransaction({
      multisig: multisigKey,
      owner: ownerA.publicKey,
      index: 0,
    })
    try {
      await provider.sendAndConfirm(transaction, [ownerA])
    } catch (e: any) {
      console.log(e)
      throw e
    }

    const tx = await client.getTransaction(multisigKey, 0)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.signers[1], true)
  })

  it('can execute approved transaction', async () => {
    const index = 0

    const { transaction } = await client.executeTransaction({
      multisig: multisigKey,
      index,
    })

    try {
      await provider.sendAndConfirm(transaction)
    } catch (e: any) {
      console.log(e)
    }

    const tx = await client.getTransaction(multisigKey, index)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.executor.toBase58(), client.wallet.publicKey.toBase58())
    assert.ok(tx.executedAt !== null)

    const multisig = await client.fetchMultisig(multisigKey)
    if (!multisig) {
      throw new Error('Invalid multisig')
    }

    const newOwners = [client.wallet.publicKey, ownerA.publicKey, ownerB.publicKey, ownerD.publicKey]
    assert.deepStrictEqual(multisig.owners, newOwners)
    assert.deepStrictEqual(multisig.ownerSetSeqno, 1)
  })

  it('can not change threshold off-chain', async () => {
    const transaction = await client.program.methods
      .changeThreshold(3)
      .accounts({ multisig: multisigKey })
      .transaction()

    try {
      await provider.sendAndConfirm(transaction)
      assert.ok(false)
    } catch (e: any) {
      assert.ok(String(e).includes('Signature verification failed'))
    }
  })

  it('can not set owners off-chain', async () => {
    const transaction = await client.program.methods
      .setOwners([ownerA.publicKey, ownerB.publicKey])
      .accounts({ multisig: multisigKey })
      .transaction()

    try {
      await provider.sendAndConfirm(transaction)
      assert.ok(false)
    } catch (e: any) {
      assert.ok(String(e).includes('Signature verification failed'))
    }
  })
})

export function assertErrorCode(error: { logs?: string[] }, code: string) {
  assert.ok(String((error?.logs ?? []).join('')).includes(`Error Code: ${code}`))
}
