import type { AnchorProvider } from '@project-serum/anchor'
import type { MultisigClient } from '@multisig/sdk'

export interface CmdContext {
  provider: AnchorProvider
  client: MultisigClient
  opts?: any
}

export * from './approve'
export * from './execute'
export * from './multisig'
export * from './transaction'
export * from './upgrade-program'
