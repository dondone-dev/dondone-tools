export const LOWERCASE_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz'
export const UPPERCASE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const NUMBER_CHARACTERS = '0123456789'
export const SPECIAL_CHARACTERS = '!@#$%^&*'
export const DESCENDER_CHARACTERS = 'gyjpq'
export const AMBIGUOUS_CHARACTERS = '0O1Il'
export const MIN_RANDOM_STRING_LENGTH = 0
export const MAX_RANDOM_STRING_LENGTH = 1024
export const BEAUTIFUL_UPPERCASE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const BEAUTIFUL_LOWERCASE_CHARACTERS = 'abcdefhkmnrstuvwxz'
export const BEAUTIFUL_NUMBER_CHARACTERS = '23456789'
export const BEAUTIFUL_STRING_CHARACTERS = BEAUTIFUL_UPPERCASE_CHARACTERS + BEAUTIFUL_NUMBER_CHARACTERS + BEAUTIFUL_LOWERCASE_CHARACTERS

export interface RandomStringOptions {
  length?: number
  includeUppercase?: boolean
  includeLowercase?: boolean
  includeNumbers?: boolean
  includeSpecial?: boolean
  minimumNumbers?: number
  avoidAmbiguous?: boolean
  beautifulString?: boolean
  startWithLetter?: boolean
}

export interface NormalizedRandomStringOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSpecial: boolean
  minimumNumbers: number
  avoidAmbiguous: boolean
  beautifulString: boolean
  startWithLetter: boolean
  characterSet: string
}

type RandomSource = () => number

const DEFAULT_OPTIONS: Required<RandomStringOptions> = {
  length: 32,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSpecial: false,
  minimumNumbers: 1,
  avoidAmbiguous: false,
  beautifulString: false,
  startWithLetter: false,
}

export function normalizeRandomStringOptions(options: RandomStringOptions = {}): NormalizedRandomStringOptions {
  const length = clampInteger(options.length ?? DEFAULT_OPTIONS.length, MIN_RANDOM_STRING_LENGTH, MAX_RANDOM_STRING_LENGTH)
  const beautifulString = options.beautifulString ?? DEFAULT_OPTIONS.beautifulString
  const avoidAmbiguous = options.avoidAmbiguous ?? DEFAULT_OPTIONS.avoidAmbiguous
  let includeUppercase = options.includeUppercase ?? DEFAULT_OPTIONS.includeUppercase
  let includeLowercase = options.includeLowercase ?? DEFAULT_OPTIONS.includeLowercase
  let includeNumbers = options.includeNumbers ?? DEFAULT_OPTIONS.includeNumbers
  let includeSpecial = options.includeSpecial ?? DEFAULT_OPTIONS.includeSpecial
  const minimumNumbers = clampInteger(options.minimumNumbers ?? DEFAULT_OPTIONS.minimumNumbers, 0, length)
  const startWithLetter = options.startWithLetter ?? DEFAULT_OPTIONS.startWithLetter

  if (beautifulString) {
    includeSpecial = false
    if (minimumNumbers > 0) includeNumbers = true
    if (startWithLetter && !includeUppercase && !includeLowercase) includeUppercase = true

    if (!includeUppercase && !includeLowercase && !includeNumbers) {
      includeUppercase = true
      includeLowercase = true
      includeNumbers = true
    }

    let characterSet = ''
    if (includeUppercase) characterSet += BEAUTIFUL_UPPERCASE_CHARACTERS
    if (includeNumbers) characterSet += BEAUTIFUL_NUMBER_CHARACTERS
    if (includeLowercase) characterSet += BEAUTIFUL_LOWERCASE_CHARACTERS

    return {
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSpecial,
      minimumNumbers,
      avoidAmbiguous,
      beautifulString,
      startWithLetter,
      characterSet,
    }
  }

  if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSpecial) {
    includeUppercase = true
    includeLowercase = true
    includeNumbers = true
  }

  if (minimumNumbers > 0) includeNumbers = true
  if (startWithLetter && !includeUppercase && !includeLowercase) includeUppercase = true

  let characterSet = ''
  if (includeUppercase) characterSet += UPPERCASE_CHARACTERS
  if (includeLowercase) characterSet += LOWERCASE_CHARACTERS
  if (includeNumbers) characterSet += NUMBER_CHARACTERS
  if (includeSpecial) characterSet += SPECIAL_CHARACTERS

  if (avoidAmbiguous) {
    characterSet = removeCharacters(characterSet, AMBIGUOUS_CHARACTERS)
  }

  if (characterSet.length === 0) {
    characterSet = LOWERCASE_CHARACTERS + UPPERCASE_CHARACTERS + NUMBER_CHARACTERS
    includeLowercase = true
    includeUppercase = true
    includeNumbers = true
    includeSpecial = false
  }

  return {
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSpecial,
    minimumNumbers,
    avoidAmbiguous,
    beautifulString,
    startWithLetter,
    characterSet,
  }
}

export function generateRandomString(options: RandomStringOptions = {}, random: RandomSource = secureRandom): string {
  const normalized = normalizeRandomStringOptions(options)
  const digits = normalized.avoidAmbiguous || normalized.beautifulString
    ? removeCharacters(NUMBER_CHARACTERS, AMBIGUOUS_CHARACTERS)
    : NUMBER_CHARACTERS
  const characters: string[] = []

  for (let index = 0; index < normalized.minimumNumbers; index += 1) {
    characters.push(pick(digits, random))
  }

  while (characters.length < normalized.length) {
    characters.push(pick(normalized.characterSet, random))
  }

  const shuffled = shuffle(characters, random)
  if (normalized.startWithLetter && shuffled.length > 0) {
    const letters = getLetterCharacters(normalized)
    if (digits.includes(shuffled[0]) && normalized.minimumNumbers > 0) {
      const swapIdx = shuffled.findIndex((c, i) => i > 0 && !digits.includes(c))
      if (swapIdx > 0) shuffled[swapIdx] = shuffled[0]
    }
    shuffled[0] = pick(letters, random)
  }

  return shuffled.join('')
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function pick(characters: string, random: RandomSource): string {
  return characters[Math.min(characters.length - 1, Math.floor(random() * characters.length))]
}

function shuffle(characters: string[], random: RandomSource): string[] {
  const shuffled = [...characters]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function removeCharacters(value: string, charactersToRemove: string): string {
  return [...value].filter((char) => !charactersToRemove.includes(char)).join('')
}

function getLetterCharacters(options: NormalizedRandomStringOptions): string {
  let letters = ''
  if (options.beautifulString) {
    if (options.includeUppercase) letters += BEAUTIFUL_UPPERCASE_CHARACTERS
    if (options.includeLowercase) letters += BEAUTIFUL_LOWERCASE_CHARACTERS
    return letters || BEAUTIFUL_UPPERCASE_CHARACTERS + BEAUTIFUL_LOWERCASE_CHARACTERS
  }

  if (options.includeUppercase) letters += UPPERCASE_CHARACTERS
  if (options.includeLowercase) letters += LOWERCASE_CHARACTERS
  if (options.avoidAmbiguous) letters = removeCharacters(letters, AMBIGUOUS_CHARACTERS)
  return letters || UPPERCASE_CHARACTERS + LOWERCASE_CHARACTERS
}

function secureRandom(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] / 0x100000000
}
