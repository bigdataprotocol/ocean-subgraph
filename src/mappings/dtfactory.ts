import { Address, BigInt, BigDecimal } from '@graphprotocol/graph-ts'
import { TokenRegistered } from '../types/DTFactory/DTFactory'
import { OceanDatatokens, Datatoken } from '../types/schema'
import { Datatoken as DatatokenContract } from '../types/templates'
import {
  tokenToDecimal,
  ZERO_BD,
} from './helpers'
import { log } from '@graphprotocol/graph-ts'

export function handleNewToken(event: TokenRegistered): void {
  let factory = OceanDatatokens.load('1')

  // if no factory yet, set up blank initial
  if (factory == null) {
    factory = new OceanDatatokens('1')
    factory.tokenCount = 0
    factory.txCount = BigInt.fromI32(0)
  }

  let datatoken = new Datatoken(event.params.tokenAddress.toHexString())
  log.error('************************ handleNewToken: datatokenId {}', [datatoken.id.toString()])

  datatoken.factoryID = event.address.toHexString()
  datatoken.symbol = event.params.tokenSymbol
  datatoken.name = event.params.tokenName
  datatoken.decimals = 18
  datatoken.address = event.params.tokenAddress.toHexString()
  datatoken.cap = tokenToDecimal(event.params.tokenCap.toBigDecimal(), 18)
  datatoken.supply = ZERO_BD
  datatoken.minter = event.params.registeredBy.toHex()
  datatoken.publisher = event.params.registeredBy.toHex()
  datatoken.createTime = event.block.timestamp.toI32()
  datatoken.holdersCount = BigInt.fromI32(0)
  datatoken.orderCount = BigInt.fromI32(0)
  datatoken.tx = event.transaction.hash
  datatoken.save()

  factory.tokenCount = factory.tokenCount + 1
  factory.save()

  DatatokenContract.create(event.params.tokenAddress)
}