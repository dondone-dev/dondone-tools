const LIMB_MASK: u32 = 0xffff
const LIMBS_2048 = 128
const LIMBS_4096 = 256
const LIMBS_8192 = 512
const SQRT_LIMBS = 130
const MEMORY_WORDS = 16_384

const a4096 = new Uint32Array(LIMBS_4096)
const b4096 = new Uint32Array(LIMBS_4096)
const product4096 = new Uint32Array(LIMBS_8192)
const a8192 = new Uint32Array(LIMBS_8192)
const b8192 = new Uint32Array(LIMBS_8192)
const product8192 = new Uint32Array(LIMBS_8192 * 2)
const divisionWork = new Uint32Array(LIMBS_8192 + 1)
const sqrtRemainder = new Uint32Array(SQRT_LIMBS)
const sqrtRoot = new Uint32Array(SQRT_LIMBS)
const sqrtCandidate = new Uint32Array(SQRT_LIMBS)
const modBase = new Uint32Array(LIMBS_2048)
const modResult = new Uint32Array(LIMBS_2048)
const modTemp = new Uint32Array(LIMBS_2048)
const memoryA = new Uint32Array(MEMORY_WORDS)
const memoryB = new Uint32Array(MEMORY_WORDS)

function rotateLeft(value: u32, amount: i32): u32 {
  return (value << amount) | (value >> (32 - amount))
}

function nextRandom(state: u32): u32 {
  state ^= state << 13
  state ^= state >> 17
  state ^= state << 5
  return state
}

function fillInputs(seed: u32): void {
  let state = seed
  for (let index = 0; index < LIMBS_8192; index += 1) {
    state = nextRandom(state + <u32>index + 0x9e3779b9)
    const valueA = state & LIMB_MASK
    state = nextRandom(state ^ 0x85ebca6b)
    const valueB = state & LIMB_MASK
    unchecked(a8192[index] = valueA)
    unchecked(b8192[index] = valueB)
    if (index < LIMBS_4096) {
      unchecked(a4096[index] = valueA)
      unchecked(b4096[index] = valueB)
    }
  }
  unchecked(a4096[LIMBS_4096 - 1] = unchecked(a4096[LIMBS_4096 - 1]) | 0x8000)
  for (let index = 0; index < MEMORY_WORDS; index += 1) {
    state = nextRandom(state + <u32>index)
    unchecked(memoryA[index] = state)
  }
}

function multiplyFull(a: Uint32Array, b: Uint32Array, output: Uint32Array, length: i32): void {
  let carry: u64 = 0
  const outputLength = length * 2
  for (let column = 0; column < outputLength; column += 1) {
    let sum = carry
    const start = column >= length ? column - length + 1 : 0
    const end = column < length ? column : length - 1
    for (let left = start; left <= end; left += 1) {
      sum += <u64>unchecked(a[left]) * <u64>unchecked(b[column - left])
    }
    unchecked(output[column] = <u32>sum & LIMB_MASK)
    carry = sum >> 16
  }
}

function divide8192By4096(): u32 {
  for (let index = 0; index < LIMBS_8192; index += 1) {
    unchecked(divisionWork[index] = unchecked(a8192[index]))
  }
  unchecked(divisionWork[LIMBS_8192] = 0)

  let quotientHash: u32 = 0x811c9dc5
  const divisorTop = unchecked(a4096[LIMBS_4096 - 1])
  for (let position = LIMBS_4096; position >= 0; position -= 1) {
    const high = unchecked(divisionWork[position + LIMBS_4096])
    const low = unchecked(divisionWork[position + LIMBS_4096 - 1])
    const estimate = (<u64>high << 16) | <u64>low
    let quotient = <u32>(estimate / <u64>divisorTop)
    if (quotient > LIMB_MASK) quotient = LIMB_MASK

    let carry: u64 = 0
    let borrow: i64 = 0
    for (let index = 0; index < LIMBS_4096; index += 1) {
      const product = <u64>unchecked(a4096[index]) * <u64>quotient + carry
      carry = product >> 16
      let value = <i64>unchecked(divisionWork[position + index]) - <i64>(<u32>product & LIMB_MASK) - borrow
      if (value < 0) {
        value += 0x10000
        borrow = 1
      } else {
        borrow = 0
      }
      unchecked(divisionWork[position + index] = <u32>value)
    }

    const topValue = <i64>unchecked(divisionWork[position + LIMBS_4096]) - <i64>carry - borrow
    unchecked(divisionWork[position + LIMBS_4096] = <u32>(topValue + (topValue < 0 ? 0x10000 : 0)) & LIMB_MASK)
    if (topValue < 0 && quotient > 0) {
      quotient -= 1
      let addCarry: u32 = 0
      for (let index = 0; index < LIMBS_4096; index += 1) {
        const value = unchecked(divisionWork[position + index]) + unchecked(a4096[index]) + addCarry
        unchecked(divisionWork[position + index] = value & LIMB_MASK)
        addCarry = value >> 16
      }
      unchecked(divisionWork[position + LIMBS_4096] = (unchecked(divisionWork[position + LIMBS_4096]) + addCarry) & LIMB_MASK)
    }
    quotientHash = rotateLeft(quotientHash ^ quotient ^ <u32>position, 5) * 0x01000193
  }
  return quotientHash
}

function clear(array: Uint32Array): void {
  for (let index = 0; index < array.length; index += 1) unchecked(array[index] = 0)
}

function shiftLeft(array: Uint32Array, length: i32, bits: i32): void {
  let carry: u32 = 0
  for (let index = 0; index < length; index += 1) {
    const value = unchecked(array[index])
    unchecked(array[index] = ((value << bits) & LIMB_MASK) | carry)
    carry = value >> (16 - bits)
  }
}

function compare(a: Uint32Array, b: Uint32Array, length: i32): i32 {
  for (let index = length - 1; index >= 0; index -= 1) {
    const left = unchecked(a[index])
    const right = unchecked(b[index])
    if (left > right) return 1
    if (left < right) return -1
  }
  return 0
}

function subtract(a: Uint32Array, b: Uint32Array, length: i32): void {
  let borrow: i64 = 0
  for (let index = 0; index < length; index += 1) {
    let value = <i64>unchecked(a[index]) - <i64>unchecked(b[index]) - borrow
    if (value < 0) {
      value += 0x10000
      borrow = 1
    } else {
      borrow = 0
    }
    unchecked(a[index] = <u32>value)
  }
}

function integerSqrt4096(): u32 {
  clear(sqrtRemainder)
  clear(sqrtRoot)
  clear(sqrtCandidate)

  for (let pair = 2047; pair >= 0; pair -= 1) {
    shiftLeft(sqrtRemainder, SQRT_LIMBS, 2)
    const bitIndex = pair * 2
    const limbIndex = bitIndex >> 4
    const offset = bitIndex & 15
    const pairBits = (unchecked(a4096[limbIndex]) >> offset) & 3
    unchecked(sqrtRemainder[0] = unchecked(sqrtRemainder[0]) | pairBits)

    shiftLeft(sqrtRoot, SQRT_LIMBS, 1)
    for (let index = 0; index < SQRT_LIMBS; index += 1) {
      unchecked(sqrtCandidate[index] = unchecked(sqrtRoot[index]))
    }
    shiftLeft(sqrtCandidate, SQRT_LIMBS, 1)
    unchecked(sqrtCandidate[0] = unchecked(sqrtCandidate[0]) | 1)
    if (compare(sqrtRemainder, sqrtCandidate, SQRT_LIMBS) >= 0) {
      subtract(sqrtRemainder, sqrtCandidate, SQRT_LIMBS)
      unchecked(sqrtRoot[0] = unchecked(sqrtRoot[0]) | 1)
    }
  }

  let hash: u32 = 0x811c9dc5
  for (let index = 0; index < SQRT_LIMBS; index += 1) {
    hash = rotateLeft(hash ^ unchecked(sqrtRoot[index]), 5) * 0x01000193
  }
  return hash
}

function multiplyLow(a: Uint32Array, b: Uint32Array, output: Uint32Array, length: i32): void {
  let carry: u64 = 0
  for (let column = 0; column < length; column += 1) {
    let sum = carry
    for (let left = 0; left <= column; left += 1) {
      sum += <u64>unchecked(a[left]) * <u64>unchecked(b[column - left])
    }
    unchecked(output[column] = <u32>sum & LIMB_MASK)
    carry = sum >> 16
  }
}

function copyPrefix(source: Uint32Array, target: Uint32Array, length: i32): void {
  for (let index = 0; index < length; index += 1) unchecked(target[index] = unchecked(source[index]))
}

function modularExponent2048(): u32 {
  for (let index = 0; index < LIMBS_2048; index += 1) {
    unchecked(modBase[index] = unchecked(b4096[index]))
    unchecked(modResult[index] = 0)
  }
  unchecked(modResult[0] = 1)
  let exponent: u32 = 0xd0d02027

  for (let bit = 0; bit < 32; bit += 1) {
    if ((exponent & 1) !== 0) {
      multiplyLow(modResult, modBase, modTemp, LIMBS_2048)
      copyPrefix(modTemp, modResult, LIMBS_2048)
    }
    multiplyLow(modBase, modBase, modTemp, LIMBS_2048)
    copyPrefix(modTemp, modBase, LIMBS_2048)
    exponent >>= 1
  }

  let hash: u32 = 0x811c9dc5
  for (let index = 0; index < LIMBS_2048; index += 1) {
    hash = rotateLeft(hash ^ unchecked(modResult[index]), 7) * 0x01000193
  }
  return hash
}

function binarySplit(start: u32, end: u32, seed: u32): u64 {
  if (end - start <= 1) {
    return (<u64>(start + 1) * <u64>0x9e3779b1) ^ <u64>seed
  }
  const middle = start + ((end - start) >> 1)
  const left = binarySplit(start, middle, seed)
  const right = binarySplit(middle, end, seed ^ 0x85ebca6b)
  return (left * (right | 1)) ^ (right + <u64>middle)
}

function copyAndVerifyMemory(seed: u32): u32 {
  let hash = seed
  for (let pass = 0; pass < 2; pass += 1) {
    for (let index = 0; index < MEMORY_WORDS; index += 1) {
      const value = unchecked(memoryA[index]) ^ <u32>pass
      unchecked(memoryB[index] = value)
    }
    for (let index = 0; index < MEMORY_WORDS; index += 1) {
      const value = unchecked(memoryB[index])
      hash = rotateLeft(hash ^ value, 5) * 0x01000193
    }
  }
  return hash
}

function checksumArray(hash: u32, array: Uint32Array): u32 {
  for (let index = 0; index < array.length; index += 1) {
    hash = rotateLeft(hash ^ unchecked(array[index]), 5) * 0x01000193
  }
  return hash
}

export function runBlock(seed: u32, blockIndex: u32): u32 {
  const blockSeed = nextRandom(seed ^ (blockIndex * 0x9e3779b9))
  fillInputs(blockSeed)
  let hash = blockSeed

  for (let repeat = 0; repeat < 8; repeat += 1) {
    multiplyFull(a4096, b4096, product4096, LIMBS_4096)
    hash = checksumArray(hash ^ <u32>repeat, product4096)
    unchecked(a4096[repeat] = (unchecked(a4096[repeat]) ^ hash) & LIMB_MASK)
  }
  for (let repeat = 0; repeat < 2; repeat += 1) {
    multiplyFull(a8192, b8192, product8192, LIMBS_8192)
    hash = checksumArray(hash ^ <u32>repeat, product8192)
    unchecked(a8192[repeat] = (unchecked(a8192[repeat]) ^ hash) & LIMB_MASK)
  }
  for (let repeat = 0; repeat < 2; repeat += 1) hash ^= divide8192By4096()
  hash ^= integerSqrt4096()
  hash ^= modularExponent2048()
  const split = binarySplit(0, 64, blockSeed)
  hash ^= <u32>split ^ <u32>(split >> 32)
  hash ^= copyAndVerifyMemory(hash)
  return rotateLeft(hash ^ blockIndex, 13) * 0x85ebca6b
}

export function selfTest(): u32 {
  return runBlock(0xd0d02026, 0)
}
