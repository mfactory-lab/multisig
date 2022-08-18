import { web3 } from '@project-serum/anchor'
import type { Address, Program } from '@project-serum/anchor'
import * as bs58 from 'bs58'
import { IDL } from './idl'
import type { Multisig, Transaction } from './interfaces'
import { toBytesInt32 } from './utils'

const ID = new web3.PublicKey('4GUuiefBoY1Qeou69d2bM2mQTEgr8wBFes3KqZaFXZzn')

export class MultisigClient {
  static programId = ID
  static IDL = IDL

  constructor(private props: MultisigClientProps) {}

  get version() {
    return this.program.idl.version
  }

  get program() {
    return this.props.program
  }

  get wallet() {
    return this.props.wallet
  }

  get pda() {
    return new MultisigPDA(this.program.programId)
  }

  async createMultisig(props: CreateMultisigProps) {
    let key = props.key

    if (!key) {
      const kp = web3.Keypair.generate()
      key = kp.publicKey
    }

    key = new web3.PublicKey(key)

    const [multisig] = await this.pda.multisig(key)
    const payer = this.wallet.publicKey
    const transaction = await this.program.methods
      .createMultisig(
        key,
        props.owners.map(o => new web3.PublicKey(o)),
        props.threshold,
      )
      .accounts({
        multisig,
        payer,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction()

    return {
      key,
      transaction,
    }
  }

  async fetchMultisig(address: Address) {
    return await this.program.account.multisig.fetchNullable(address) as unknown as Multisig
  }

  async getMultisig(key: Address) {
    return await this.fetchMultisig((await this.pda.multisig(key))[0])
  }

  async findMultisigByOwner(owner: web3.PublicKey) {
    const accounts = await this.program.account.multisig.all([
      // TODO: optimize
    ])
    return accounts.filter(a => [...a.account.owners].some(o => o.toBase58() === owner.toBase58()))
  }

  async createTransaction(props: CreateTransactionProps) {
    const { multisig } = props
    const index = props.index ?? (await this.fetchMultisig(multisig))?.transactionCount ?? 0
    const [key] = await this.pda.transaction(multisig, index)

    const transaction = await this.program.methods
      .createTransaction(props.instructions)
      .accounts({
        multisig,
        transaction: key,
        proposer: this.wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .transaction()

    return {
      key,
      transaction,
    }
  }

  async fetchTransaction(address: Address) {
    return await this.program.account.transaction.fetchNullable(address) as unknown as Transaction
  }

  async getTransaction(multisig: Address, index: number) {
    return await this.fetchTransaction(
      (await this.pda.transaction(multisig, index))[0],
    )
  }

  async findTransactions(props: FindTransactionsProps) {
    const filters = [
      { memcmp: { offset: 8, bytes: new web3.PublicKey(props.multisig).toBase58() } },
    ]
    if (props.index !== undefined) {
      filters.push({ memcmp: { offset: 8 + 32, bytes: bs58.encode(toBytesInt32(+props.index)) } })
    }
    if (props.proposer !== undefined) {
      filters.push({ memcmp: { offset: 8 + 32 + 4, bytes: new web3.PublicKey(props.proposer).toBase58() } })
    }
    if (props.executor !== undefined) {
      filters.push({ memcmp: { offset: 8 + 32 + 4 + 32, bytes: new web3.PublicKey(props.executor).toBase58() } })
    }
    return await this.program.account.transaction.all(filters)
  }

  async executeTransaction(props: ExecuteTransactionProps) {
    const [transactionPda] = await this.pda.transaction(props.multisig, props.index)
    const { instructions } = await this.program.account.transaction.fetch(transactionPda) as Transaction
    const [signer] = await this.pda.signer(props.multisig)

    const transaction = await this.program.methods
      .executeTransaction()
      .accounts({
        multisig: props.multisig,
        transaction: transactionPda,
        executor: this.wallet.publicKey,
      })
      .remainingAccounts(instructions.flatMap(ix => [
        {
          pubkey: ix.programId,
          isSigner: false,
          isWritable: false,
        },
        ...ix.keys.map((k) => {
          return k.pubkey.toString() === signer.toString() ? { ...k, isSigner: false } : k
        }),
      ]))
      .transaction()

    return {
      transaction,
    }
  }

  async approveTransaction(props: ApproveProps) {
    const [transactionPda] = await this.pda.transaction(props.multisig, props.index)

    const transaction = await this.program.methods
      .approve()
      .accounts({
        multisig: props.multisig,
        transaction: transactionPda,
        owner: props.owner ?? this.wallet.publicKey,
      })
      .transaction()

    return {
      transaction,
    }
  }

  async setOwners(props: SetOwnersProps) {
    const data = this.program.coder.instruction.encode('set_owners', {
      owners: props.owners,
    })

    const [signer] = await this.pda.signer(props.multisig)

    const instruction = new web3.TransactionInstruction({
      programId: this.program.programId,
      keys: [
        {
          pubkey: signer,
          isWritable: true,
          isSigner: true,
        },
      ],
      data,
    } as any)

    const { transaction } = await this.createTransaction({
      multisig: props.multisig,
      instructions: [instruction],
    })

    return {
      transaction,
    }
  }

  async changeThreshold(props: ChangeThresholdProps) {
    const data = this.program.coder.instruction.encode('change_threshold', {
      threshold: props.threshold,
    })
    const [signer] = await this.pda.signer(props.multisig)

    const instruction = new web3.TransactionInstruction({
      programId: this.program.programId,
      keys: [
        {
          pubkey: signer,
          isWritable: true,
          isSigner: true,
        },
      ],
      data,
    } as any)

    const { transaction } = await this.createTransaction({
      multisig: props.multisig,
      instructions: [instruction],
    })

    return {
      transaction,
    }
  }
}

const MULTISIG_SEED_PREFIX = 'multisig'
const TRANSACTION_SEED_PREFIX = 'transaction'

class MultisigPDA {
  constructor(private programId: web3.PublicKey) {}

  signer = (multisig: Address) => this.pda([
    new web3.PublicKey(multisig).toBuffer(),
  ])

  multisig = (key: Address) => this.pda([
    Buffer.from(MULTISIG_SEED_PREFIX),
    new web3.PublicKey(key).toBuffer(),
  ])

  transaction = (multisig: Address, index: number) => this.pda([
    Buffer.from(TRANSACTION_SEED_PREFIX),
    new web3.PublicKey(multisig).toBuffer(),
    toBytesInt32(index),
  ])

  private async pda(seeds: Array<Buffer | Uint8Array>) {
    return await web3.PublicKey.findProgramAddress(seeds, this.programId)
  }
}

export interface Wallet {
  signTransaction(tx: web3.Transaction): Promise<web3.Transaction>
  signAllTransactions(txs: web3.Transaction[]): Promise<web3.Transaction[]>
  publicKey: web3.PublicKey
}

interface MultisigClientProps {
  wallet: Wallet
  program: Program<typeof IDL>
}

interface CreateMultisigProps {
  owners: Address[]
  threshold: number
  key?: Address
}

interface CreateTransactionProps {
  multisig: web3.PublicKey
  instructions: web3.TransactionInstruction[]
  index?: number
}

interface ExecuteTransactionProps {
  multisig: web3.PublicKey
  index: number
}

interface ApproveProps {
  multisig: web3.PublicKey
  owner?: web3.PublicKey
  index: number
}

interface ChangeThresholdProps {
  multisig: web3.PublicKey
  threshold: number
}

interface SetOwnersProps {
  multisig: web3.PublicKey
  owners: web3.PublicKey[]
}

interface FindTransactionsProps {
  multisig: Address
  proposer?: Address
  executor?: Address
  index?: number
}
