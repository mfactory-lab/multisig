import { clusterApiUrl } from '@solana/web3.js'
import type { Cluster } from '@solana/web3.js'

export const clusterUrl = (c: Cluster) => {
  switch (c) {
    case 'mainnet-beta':
      // return 'https://rpc.theindex.io'
      // return 'https://ssc-dao.genesysgo.net'
      // return 'https://jpoolone.genesysgo.net'
      // return 'https://solana-api.projectserum.com/'
      return 'https://solana-api.syndica.io/access-token/Ay411Gnu2mddZxXvj594Dvlt4LHLhWCGCtXueiPr9OJy6IAGBY1X9D1wYndnozXb/rpc'
  }
  return clusterApiUrl(c)
}
