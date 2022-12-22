import { AnchorProvider, Program, Wallet, web3 } from '@project-serum/anchor'
import { assert } from 'chai'
// noinspection ES6PreferShortImport
import { MultisigClient } from '../packages/sdk/src'

const opts = AnchorProvider.defaultOptions()
const provider = new AnchorProvider(
  new web3.Connection('http://localhost:8899', opts.preflightCommitment),
  new Wallet(web3.Keypair.generate()),
  AnchorProvider.defaultOptions(),
)

describe('multisig', () => {
  const client = new MultisigClient({
    program: new Program(MultisigClient.IDL, MultisigClient.programId, provider),
    wallet: provider.wallet,
  })

  const ownerA = web3.Keypair.generate()
  const ownerB = web3.Keypair.generate()
  const ownerC = web3.Keypair.generate()
  const ownerD = web3.Keypair.generate()
  const owners = [client.wallet.publicKey, ownerA.publicKey, ownerB.publicKey, ownerC.publicKey]

  let multisigAddr: web3.PublicKey

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(client.wallet.publicKey, 10 * web3.LAMPORTS_PER_SOL),
    )
  })

  it('can create multisig', async () => {
    const threshold = 2
    const { transaction, base } = await client.createMultisig({ owners, threshold })
    await provider.sendAndConfirm(transaction)

    multisigAddr = (await client.pda.multisig(base))[0]

    const multisig = await client.fetchMultisig(multisigAddr)
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

    const [signer] = await client.pda.multisigSigner(multisigAddr)

    const index = 0

    // change multisig owners
    const ix1 = new web3.TransactionInstruction({
      programId: client.program.programId,
      keys: [
        {
          pubkey: multisigAddr,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: signer,
          isWritable: true,
          isSigner: true,
        },
      ],
      data,
    } as any)

    // transfer some SOL from multisig account
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(signer, 10 * web3.LAMPORTS_PER_SOL),
    )
    const ix2 = web3.SystemProgram.transfer({
      fromPubkey: signer,
      toPubkey: new web3.PublicKey(multisigAddr),
      lamports: web3.LAMPORTS_PER_SOL,
    })

    const { transaction } = await client.createTransaction({
      multisig: multisigAddr,
      instructions: [ix1, ix2],
      index,
    })

    try {
      await provider.sendAndConfirm(transaction)
    } catch (e) {
      console.log(e)
      throw e
    }

    const tx = await client.getTransaction(multisigAddr, index)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.index, 0)
    assert.equal(tx.proposer.toBase58(), client.wallet.publicKey.toBase58())
    assert.deepEqual(tx.instructions, [ix1, ix2])
    assert.equal(tx.signers.length, owners.length)
    assert.equal(tx.signers[0], true)
  })

  it('can not execute unapproved transaction', async () => {
    const index = 0
    const { transaction } = await client.executeTransaction({
      multisig: multisigAddr,
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
      multisig: multisigAddr,
      owner: ownerA.publicKey,
      index: 0,
    })
    try {
      await provider.sendAndConfirm(transaction, [ownerA])
    } catch (e: any) {
      console.log(e)
      throw e
    }

    const tx = await client.getTransaction(multisigAddr, 0)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.signers[1], true)
  })

  it('can execute approved transaction', async () => {
    const index = 0

    const { transaction } = await client.executeTransaction({
      multisig: multisigAddr,
      index,
    })

    try {
      await provider.sendAndConfirm(transaction)
    } catch (e: any) {
      console.log(e)
      assert.ok(false)
    }

    const tx = await client.getTransaction(multisigAddr, index)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.executor.toBase58(), client.wallet.publicKey.toBase58())
    assert.ok(tx.executedAt !== null)

    const multisig = await client.fetchMultisig(multisigAddr)
    if (!multisig) {
      throw new Error('Invalid multisig')
    }

    const newOwners = [client.wallet.publicKey, ownerA.publicKey, ownerB.publicKey, ownerD.publicKey]
    assert.deepStrictEqual(multisig.owners, newOwners)
    assert.deepStrictEqual(multisig.ownerSetSeqno, 1)
  })

  it('can create transaction with auto-generated index', async () => {
    const [signer] = await client.pda.multisigSigner(multisigAddr)

    const ix = web3.SystemProgram.transfer({
      fromPubkey: signer,
      toPubkey: new web3.PublicKey(multisigAddr),
      lamports: web3.LAMPORTS_PER_SOL,
    })

    const { transaction, key } = await client.createTransaction({
      multisig: multisigAddr,
      instructions: [ix],
    })

    try {
      await provider.sendAndConfirm(transaction)
    } catch (e) {
      console.log(e)
      throw e
    }

    const tx = await client.fetchTransaction(key)
    if (!tx) {
      throw new Error('Invalid transaction')
    }

    assert.equal(tx.index, 1)
    assert.equal(tx.proposer.toBase58(), client.wallet.publicKey.toBase58())
    assert.deepEqual(tx.instructions, [ix])
  })

  it('can not change threshold off-chain', async () => {
    const [multisigSigner] = await client.pda.multisigSigner(multisigAddr)

    const transaction = await client.program.methods
      .changeThreshold(3)
      .accounts({ multisig: multisigAddr, multisigSigner })
      .transaction()

    try {
      await provider.sendAndConfirm(transaction)
      assert.ok(false)
    } catch (e: any) {
      assert.ok(String(e).includes('Signature verification failed'))
    }
  })

  it('can not set owners off-chain', async () => {
    const [multisigSigner] = await client.pda.multisigSigner(multisigAddr)

    const transaction = await client.program.methods
      .setOwners([ownerA.publicKey, ownerB.publicKey])
      .accounts({ multisig: multisigAddr, multisigSigner })
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
