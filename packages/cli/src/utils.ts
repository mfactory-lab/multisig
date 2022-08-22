import { PublicKey, clusterApiUrl } from '@solana/web3.js'
import type { Cluster, Transaction } from '@solana/web3.js'

export const clusterUrl = (c: Cluster) => {
  switch (c) {
    case 'mainnet-beta':
      // return 'https://rpc.theindex.io'
      // return 'https://ssc-dao.genesysgo.net'
      // return 'https://jpoolone.genesysgo.net'
      // return 'https://solana-api.projectserum.com/'
      return 'https://solana-api.syndica.io/access-token/Ay411Gnu2mddZxXvj594Dvlt4LHLhWCGCtXueiPr9OJy6IAGBY1X9D1wYndnozXb/rpc'
  }
  return clusterApiUrl(c as any)
}

/**
 * Generates a link for inspecting the contents
 */
export function inspectTransaction(tx: Transaction, cluster: Cluster = 'mainnet-beta') {
  tx.recentBlockhash = PublicKey.default.toString()
  const base64 = tx.serializeMessage().toString('base64')
  return {
    base64,
    url: `https://explorer.solana.com/tx/inspector?cluster=${cluster}&message=${encodeURIComponent(
      base64,
    )}`,
  }
}
