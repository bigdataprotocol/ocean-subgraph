import { BigInt, BigDecimal, log } from '@graphprotocol/graph-ts'
import { BPoolRegistered } from '../@types/Factory/Factory'
import { PoolFactory, Pool, Global } from '../@types/schema'
import { Pool as PoolContract } from '../@types/templates'
import { ZERO_BD, getGlobalStats } from '../helpers'

export function handleNewPool(event: BPoolRegistered): void {
  let factory = PoolFactory.load('1')

  if (factory == null) {
    factory = new PoolFactory('1')
    factory.totalOceanLiquidity = ZERO_BD
    factory.totalSwapVolume = ZERO_BD
    factory.totalSwapFee = ZERO_BD
    factory.totalValueLocked = ZERO_BD
    factory.orderCount = BigInt.fromI32(0)
    factory.poolCount = 0
    factory.finalizedPoolCount = 0
  }

  const pool = new Pool(event.params.bpoolAddress.toHexString())
  log.info('************************ handleNewPool: poolId {}', [
    pool.id.toString()
  ])

  pool.factoryID = event.address.toHexString()
  pool.controller = event.params.registeredBy
  pool.publicSwap = false
  pool.finalized = false
  pool.symbol = ''
  pool.name = ''
  // pool.cap =
  pool.active = true
  pool.swapFee = BigDecimal.fromString('0.000001')

  pool.totalWeight = ZERO_BD
  pool.totalShares = ZERO_BD
  pool.totalSwapVolume = ZERO_BD
  pool.totalSwapFee = ZERO_BD
  pool.valueLocked = ZERO_BD

  pool.datatokenReserve = ZERO_BD
  pool.oceanReserve = ZERO_BD
  pool.spotPrice = ZERO_BD // : BigDecimal!
  pool.consumePrice = ZERO_BD // : BigDecimal!

  pool.tokenCount = BigInt.fromI32(0)
  pool.holderCount = BigInt.fromI32(0)
  pool.joinCount = BigInt.fromI32(0)
  pool.exitCount = BigInt.fromI32(0)
  pool.swapCount = BigInt.fromI32(0)
  pool.transactionCount = BigInt.fromI32(0)

  pool.datatokenAddress = ''

  pool.createTime = event.block.timestamp.toI32()
  pool.tx = event.transaction.hash

  pool.save()

  factory.poolCount = factory.poolCount + 1
  factory.save()
  const gStats: Global | null = getGlobalStats()
  gStats.poolCount = factory.poolCount
  gStats.save()

  PoolContract.create(event.params.bpoolAddress)
}
