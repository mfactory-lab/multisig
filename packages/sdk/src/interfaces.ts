import type { BN, web3 } from '@project-serum/anchor'

export interface Multisig {
  base: Uint8Array
  owners: web3.PublicKey[]
  threshold: number
  transactionCount: number
  ownerSetSeqno: number
  bump: number
  signerBump: number
}

export interface Transaction {
  multisig: web3.PublicKey
  proposer: web3.PublicKey
  executor: web3.PublicKey
  instructions: web3.TransactionInstruction[]
  signers: boolean[]
  index: number
  ownerSetSeqno: number
  executedAt: BN
  createdAt: BN
  bump: number
}
