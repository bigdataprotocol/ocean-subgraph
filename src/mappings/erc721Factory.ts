import { log } from '@graphprotocol/graph-ts'
import { NFTCreated, TokenCreated } from '../@types/ERC721Factory/ERC721Factory'
import { decimal } from './utils/constants'
import { weiToDecimal } from './utils/generic'

import { getUser } from './utils/userUtils'
import { getToken, getNftToken } from './utils/tokenUtils'
import { addDatatoken } from './utils/globalUtils'

export function handleNftCreated(event: NFTCreated): void {
  log.warning('nft handleNftCreated {}', [event.params.tokenURI.toString()])
  // const nft = new Nft(event.params.newTokenAddress.toHexString())
  const nft = getNftToken(event.params.newTokenAddress)
  const user = getUser(event.params.admin.toHexString())
  nft.owner = user.id
  nft.address = event.params.newTokenAddress.toHexString()
  nft.name = event.params.tokenName
  nft.symbol = event.params.symbol.toString()
  nft.tokenUri = event.params.tokenURI.toString()
  nft.createdTimestamp = event.block.timestamp.toI32()
  nft.tx = event.transaction.hash.toHex()
  nft.block = event.block.number.toI32()

  nft.save()
}

export function handleNewToken(event: TokenCreated): void {
  const token = getToken(event.params.newTokenAddress, true)
  // const token = new Token(event.params.newTokenAddress.toHexString())

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

  token.save()
  addDatatoken()
}
