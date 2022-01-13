import { log } from '@graphprotocol/graph-ts'
import { NFTCreated, TokenCreated } from '../@types/ERC721Factory/ERC721Factory'
import { Nft, Token } from '../@types/schema'
import { decimal, integer } from './utils/constants'
import { weiToDecimal } from './utils/generic'
import { getGlobalStats } from './utils/globalUtils'
import { getUser } from './utils/userUtils'

export function handleNftCreated(event: NFTCreated): void {
  log.warning('handleNftCreated is starting', [])
  const nft = new Nft(event.params.newTokenAddress.toHexString())

  const user = getUser(event.params.admin.toHexString())
  nft.owner = user.id
  nft.address = event.params.newTokenAddress.toHexString()
  nft.name = event.params.tokenName
  nft.symbol = ''
  nft.createdTimestamp = event.block.timestamp.toI32()
  nft.tx = event.transaction.hash.toHex()
  nft.block = event.block.number.toI32()

  const globalStats = getGlobalStats()
  globalStats.nftCount = globalStats.nftCount.plus(integer.ONE)

  globalStats.save()
  nft.save()
}

export function handleNewToken(event: TokenCreated): void {
  log.warning('handleNewToken {} {}', [
    event.transaction.from.toHexString(),
    event.address.toHexString()
  ])
  const token = new Token(event.params.newTokenAddress.toHexString())
  token.isDatatoken = true
  token.address = event.params.newTokenAddress.toHexString()
  token.createdTimestamp = event.block.timestamp.toI32()
  token.tx = event.transaction.hash.toHex()
  token.block = event.block.number.toI32()

  token.nft = event.params.creator.toHexString()

  token.name = event.params.name
  token.symbol = event.params.symbol
  token.decimals = 18
  token.supply = decimal.ZERO
  token.cap = weiToDecimal(event.params.cap.toBigDecimal(), 18)

  const globalStats = getGlobalStats()
  globalStats.datatokenCount = globalStats.datatokenCount.plus(integer.ONE)

  globalStats.save()
  token.save()
}
