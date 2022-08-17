import { BN, web3 } from '@project-serum/anchor'
import type { Address, Program } from '@project-serum/anchor'
import type { IDL } from './idl'

export class MultisigClient {
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

    const transaction = await this.program.methods
      .createMultisig(key, props.owners, props.threshold)
      .accounts({
        payer: this.wallet.publicKey,
      })
      .transaction()

    return {
      key,
      transaction,
    }
  }

  async getMultisig(key: web3.PublicKey) {
    return await this.program.account.multisig.fetchNullable(
      (await this.pda.multisig(key))[0],
    )
  }

  async findMultisig(owner: web3.PublicKey) {
    const accounts = await this.program.account.multisig.all([
      // TODO: optimize
    ])
    return accounts.filter(a => a.account.owners.includes(owner))
  }

  async createTransaction(props: CreateTransactionProps) {
    const transaction = await this.program.methods
      .createTransaction(props.instructions)
      .accounts({
        multisig: props.multisig,
        proposer: this.wallet.publicKey,
        payer: this.wallet.publicKey,
      })
      .transaction()

    return {
      transaction,
    }
  }

  async getTransaction(multisig: web3.PublicKey, index: number) {
    return await this.program.account.transaction.fetchNullable(
      (await this.pda.transaction(multisig, index))[0],
    )
  }

  async findTransactions(props: FindTransactionsProps) {
    return await this.program.account.transaction.all([
      { memcmp: { offset: 8, bytes: String(props.multisig) } },
    ])
  }

  async executeTransaction(props: ExecuteTransactionProps) {
    const [tx] = await this.pda.transaction(props.multisig, props.index)

    const transaction = await this.program.methods
      .executeTransaction()
      .accounts({
        multisig: props.multisig,
        transaction: tx,
        executor: this.wallet.publicKey,
      })
      .transaction()

    return {
      transaction,
    }
  }

  async approve(props: ApproveProps) {
    const [tx] = await this.pda.transaction(props.multisig, props.index)

    const transaction = await this.program.methods
      .approve()
      .accounts({
        multisig: props.multisig,
        transaction: tx,
        owner: this.wallet.publicKey,
      })
      .transaction()

    return {
      transaction,
    }
  }

  async changeThreshold(props: ChangeThresholdProps) {
    const transaction = await this.program.methods
      .changeThreshold(props.threshold)
      .accounts({
        multisig: props.multisig,
      })
      .transaction()
    return {
      transaction,
    }
  }

  async setOwners(props: SetOwnersProps) {
    const transaction = await this.program.methods
      .setOwners(props.owners)
      .accounts({
        multisig: props.multisig,
      })
      .transaction()
    return {
      transaction,
    }
  }
}

const MULTISIG_SEED_PREFIX = 'multisig'
const TRANSACTION_SEED_PREFIX = 'transaction'

class MultisigPDA {
  constructor(private programId: web3.PublicKey) {}

  multisig = (key: web3.PublicKey) => this.pda([Buffer.from(MULTISIG_SEED_PREFIX), key.toBuffer()])

  transaction = (multisig: web3.PublicKey, index: number) => this.pda([
    Buffer.from(TRANSACTION_SEED_PREFIX),
    multisig.toBuffer(),
    new BN(index).toBuffer(),
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
  owners: web3.PublicKey[]
  threshold: number
  key?: web3.PublicKey
}

interface CreateTransactionProps {
  multisig: web3.PublicKey
  instructions: web3.TransactionInstruction[]
}

interface ExecuteTransactionProps {
  multisig: web3.PublicKey
  index: number
}

interface ApproveProps {
  multisig: web3.PublicKey
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
}
