import { PoolTransaction } from '../@types/schema'
import {
  LOG_BPT,
  LOG_EXIT,
  LOG_JOIN,
  LOG_SETUP,
  LOG_SWAP
} from '../@types/templates/BPool/BPool'
import { Transfer } from '../@types/templates/BPool/BToken'
import { integer, PoolTransactionType } from './utils/constants'
import { weiToDecimal } from './utils/generic'
import {
  calcSpotPrice,
  getPool,
  getPoolTransaction,
  getPoolShares,
  getPoolSnapshot
} from './utils/poolUtils'
import { getToken } from './utils/tokenUtils'
import { getUser } from './utils/userUtils'

// kinda redundant code in join/swap/exit
export function handleJoin(event: LOG_JOIN): void {
  const pool = getPool(event.address.toHex())
  const user = getUser(event.params.caller.toHex())
  const poolTx = getPoolTransaction(event, user.id, PoolTransactionType.JOIN)

  pool.transactionCount = pool.transactionCount.plus(integer.ONE)
  pool.joinCount = pool.joinCount.plus(integer.ONE)

  // get token,  update pool transaction, poolSnapshot
  const poolSnapshot = getPoolSnapshot(pool.id, event.block.timestamp.toI32())
  const token = getToken(event.params.tokenIn.toHex())
  const ammount = weiToDecimal(
    event.params.tokenAmountIn.toBigDecimal(),
    token.decimals
  )
  if (token.isDatatoken) {
    poolTx.datatoken = token.id
    poolTx.datatokenValue = ammount

    poolSnapshot.datatokenLiquidity =
      poolSnapshot.datatokenLiquidity.plus(ammount)

    pool.datatokenLiquidity.plus(ammount)
  } else {
    poolTx.baseToken = token.id
    poolTx.baseTokenValue = ammount

    poolSnapshot.baseTokenLiquidity =
      poolSnapshot.baseTokenLiquidity.plus(ammount)

    pool.baseTokenLiquidity.plus(ammount)
  }

  poolSnapshot.save()
  poolTx.save()
  pool.save()
}

export function handleExit(event: LOG_EXIT): void {
  const pool = getPool(event.address.toHex())
  const user = getUser(event.params.caller.toHex())
  const poolTx = getPoolTransaction(event, user.id, PoolTransactionType.EXIT)

  pool.transactionCount = pool.transactionCount.plus(integer.ONE)
  pool.joinCount = pool.joinCount.plus(integer.ONE)

  // get token and update pool transaction, value is negative because this is an exit event.
  const token = getToken(event.params.tokenOut.toHex())
  const poolSnapshot = getPoolSnapshot(pool.id, event.block.timestamp.toI32())
  const ammount = weiToDecimal(
    event.params.tokenAmountOut.toBigDecimal(),
    token.decimals
  )
  if (token.isDatatoken) {
    poolTx.datatoken = token.id
    poolTx.datatokenValue = ammount.neg()

    poolSnapshot.datatokenLiquidity =
      poolSnapshot.datatokenLiquidity.minus(ammount)

    pool.datatokenLiquidity.minus(ammount)
  } else {
    poolTx.baseToken = token.id
    poolTx.baseTokenValue = ammount.neg()

    poolSnapshot.baseTokenLiquidity =
      poolSnapshot.baseTokenLiquidity.minus(ammount)

    pool.baseTokenLiquidity.minus(ammount)
  }

  poolSnapshot.save()
  poolTx.save()
  pool.save()
}

export function handleSwap(event: LOG_SWAP): void {
  const pool = getPool(event.address.toHex())
  const user = getUser(event.params.caller.toHex())
  const poolTx = getPoolTransaction(event, user.id, PoolTransactionType.SWAP)

  pool.transactionCount = pool.transactionCount.plus(integer.ONE)
  pool.joinCount = pool.joinCount.plus(integer.ONE)

  const poolSnapshot = getPoolSnapshot(pool.id, event.block.timestamp.toI32())
  // get token out and update pool transaction, value is negative
  const tokenOut = getToken(event.params.tokenOut.toHex())
  const ammountOut = weiToDecimal(
    event.params.tokenAmountOut.toBigDecimal(),
    tokenOut.decimals
  )
  if (tokenOut.isDatatoken) {
    poolTx.datatoken = tokenOut.id
    poolTx.datatokenValue = ammountOut.neg()

    pool.datatokenLiquidity = pool.datatokenLiquidity.minus(ammountOut)

    poolSnapshot.datatokenLiquidity =
      poolSnapshot.datatokenLiquidity.minus(ammountOut)
  } else {
    poolTx.baseToken = tokenOut.id
    poolTx.baseTokenValue = ammountOut.neg()

    pool.baseTokenLiquidity = pool.baseTokenLiquidity.minus(ammountOut)

    poolSnapshot.baseTokenLiquidity =
      poolSnapshot.baseTokenLiquidity.minus(ammountOut)
  }

  // update pool token in
  const tokenIn = getToken(event.params.tokenIn.toHex())
  const ammountIn = weiToDecimal(
    event.params.tokenAmountIn.toBigDecimal(),
    tokenIn.decimals
  )
  if (tokenIn.isDatatoken) {
    poolTx.datatoken = tokenIn.id
    poolTx.datatokenValue = ammountIn

    pool.datatokenLiquidity = pool.datatokenLiquidity.plus(ammountIn)

    poolSnapshot.datatokenLiquidity =
      poolSnapshot.datatokenLiquidity.plus(ammountIn)
  } else {
    poolTx.baseToken = tokenIn.id
    poolTx.baseTokenValue = ammountIn

    pool.baseTokenLiquidity = pool.baseTokenLiquidity.plus(ammountIn)

    poolSnapshot.baseTokenLiquidity =
      poolSnapshot.baseTokenLiquidity.plus(ammountIn)
  }

  // update spot price
  const isTokenInDatatoken = tokenIn.isDatatoken
  const spotPrice = calcSpotPrice(
    pool.id,
    isTokenInDatatoken ? tokenOut.id : tokenIn.id,
    isTokenInDatatoken ? tokenIn.id : tokenOut.id,
    isTokenInDatatoken ? tokenIn.decimals : tokenOut.decimals
  )
  pool.spotPrice = spotPrice
  poolSnapshot.spotPrice = spotPrice

  poolSnapshot.save()
  poolTx.save()
  pool.save()
}

// setup is just to set token weight(it will mostly be 50:50) and spotPrice
export function handleSetup(event: LOG_SETUP): void {
  const pool = getPool(event.address.toHex())

  const token = getToken(event.params.baseToken.toHex())
  pool.baseToken = token.id
  pool.baseTokenWeight = weiToDecimal(
    event.params.baseTokenWeight.toBigDecimal(),
    token.decimals
  )

  // decimals hardcoded because datatokens have 18 decimals
  const datatoken = getToken(event.params.dataToken.toHex())
  pool.datatoken = datatoken.id
  pool.datatokenWeight = weiToDecimal(
    event.params.dataTokenWeight.toBigDecimal(),
    18
  )

  // calculate spotPrice
  const spotPrice = calcSpotPrice(
    pool.id,
    pool.baseToken,
    pool.datatoken,
    token.decimals
  )
  pool.spotPrice = spotPrice
  pool.isFinalized = true

  pool.save()
  datatoken.save()
}

export function handleBpt(event: LOG_BPT): void {
  const pool = getPool(event.address.toHex())
  const poolShares = getPoolShares(pool.id, event.transaction.from.toHex())
  const poolTx = PoolTransaction.load(event.transaction.hash.toHex())
  // TODO: should we return here if null? theoretically this should not be null since LOG_BPT is after the other events
  if (!poolTx) return

  const decimalBpt = weiToDecimal(event.params.bptAmount.toBigDecimal(), 18)

  switch (poolTx.type) {
    case PoolTransactionType.JOIN: {
      poolShares.shares = poolShares.shares.plus(decimalBpt)
      pool.totalShares.plus(decimalBpt)
      break
    }
    case PoolTransactionType.EXIT: {
      poolShares.shares = poolShares.shares.minus(decimalBpt)
      pool.totalShares.minus(decimalBpt)
      break
    }
  }

  poolShares.shares = weiToDecimal(event.params.bptAmount.toBigDecimal(), 18)

  pool.save()
  poolShares.save()
}

export function handlerBptTransfer(event: Transfer): void {
  const fromUser = getPoolShares(
    event.address.toHex(),
    event.params.src.toHex()
  )
  const toUser = getPoolShares(event.address.toHex(), event.params.dst.toHex())
  const ammount = weiToDecimal(event.params.amt.toBigDecimal(), 18)

  fromUser.shares = fromUser.shares.minus(ammount)
  toUser.shares = toUser.shares.plus(ammount)

  fromUser.save()
  toUser.save()
}
