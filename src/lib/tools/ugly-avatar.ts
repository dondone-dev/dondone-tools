const BACKGROUND_PRESETS: Record<string, string> = {
  'peach-puff': '#f6d2b8',
  'mint-soda': '#cfe8d6',
  'lavender-fog': '#d8d1ef',
  sunbeam: '#f6df92',
  'berry-cream': '#d8bed7',
  'sea-glass': '#c9e3db',
  'apricot-milk': '#f4d4bd',
  'blue-chalk': '#cad8ee',
  'pistachio-foam': '#d7e7bd',
  rosewater: '#f2ced6',
  'smoke-pearl': '#d8d7de',
  'lemon-custard': '#efe2a2',
  'melon-fizz': '#d8efca',
  'sky-wash': '#c9e7f2',
}

const AUTO_BACKGROUNDS = Object.values(BACKGROUND_PRESETS)
const FACE_KINDS = ['blended-egg', 'boxy-squash', 'lopsided-pear']
const EYE_KINDS = ['droopy', 'sleepy', 'round', 'pinched']
const MOUTH_KINDS = ['u-smile', 'crooked-bean', 'tilted-oval']
const NOSE_STYLES = ['dots', 'bridge']
const HAIR_MODES = ['burst', 'frizz', 'sweep', 'split', 'halo', 'curtain', 'cowlick', 'buzz', 'sparse', 'sidepart', 'tufts']
const ACCESSORY_VARIANTS = ['none', 'blush', 'glasses', 'mole']
const NATURAL_HAIR_COLORS = ['#201613', '#38231c', '#543126', '#72503d', '#9b7858', '#d1bf9a']
const VIVID_HAIR_COLORS = ['#d94868', '#ff8c42', '#00a6a6', '#4f7cff', '#8e59d1', '#df4fd3']
const AVATAR_VIEWBOX_SIZE = 256
const AVATAR_Y_OFFSET = AVATAR_VIEWBOX_SIZE * 0.12

type Point = [number, number]
type Random = () => number

function randRange(random: Random, min: number, max: number): number { return min + (max - min) * random() }
function randInt(random: Random, min: number, max: number): number { return Math.floor(randRange(random, min, max + 1)) }
function pick<T>(list: T[], random: Random): T { return list[Math.floor(random() * list.length)] }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)) }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }
function rotatePoint(point: Point, angle: number): Point {
  const cos = Math.cos(angle); const sin = Math.sin(angle)
  return [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos]
}
function translatePoint(point: Point, dx: number, dy: number): Point { return [point[0] + dx, point[1] + dy] }
function formatNumber(value: number): number { return Number(value.toFixed(2)) }
function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, segments: number): Point[] {
  const points: Point[] = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments; const omt = 1 - t
    points.push([
      formatNumber(omt ** 3 * p0[0] + 3 * omt ** 2 * t * p1[0] + 3 * omt * t ** 2 * p2[0] + t ** 3 * p3[0]),
      formatNumber(omt ** 3 * p0[1] + 3 * omt ** 2 * t * p1[1] + 3 * omt * t ** 2 * p2[1] + t ** 3 * p3[1]),
    ])
  }
  return points
}
function pathFromPoints(points: Point[], close = true): string {
  const commands = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${formatNumber(point[0])} ${formatNumber(point[1])}`)
  if (close) commands.push('Z')
  return commands.join(' ')
}
function polylinePoints(points: Point[]): string {
  return points.map((point) => `${formatNumber(point[0])},${formatNumber(point[1])}`).join(' ')
}
function average(points: Point[]): Point {
  const total = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]] as Point, [0, 0] as Point)
  return [total[0] / points.length, total[1] / points.length]
}
function normalizePoints(points: Point[]): Point[] {
  const center = average(points)
  return points.map((point) => [point[0] - center[0], point[1] - center[1]])
}

function generateEggContour(random: Random, segments: number, radiusX: number, radiusY: number, wobble: number, taper: number): Point[] {
  const points: Point[] = []
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    const yScale = Math.sin(angle) > 0 ? 1 + taper : 1 - taper * 0.45
    points.push([
      Math.cos(angle) * radiusX * (1 + randRange(random, -wobble, wobble)),
      Math.sin(angle) * radiusY * yScale * (1 + randRange(random, -wobble, wobble)),
    ])
  }
  return points
}

function generateRectContour(random: Random, segments: number, width: number, height: number, roundness: number, jitter: number): Point[] {
  const points: Point[] = []
  for (let index = 0; index < segments; index += 1) {
    const angle = (Math.PI * 2 * index) / segments
    const cos = Math.cos(angle); const sin = Math.sin(angle)
    const denom = (Math.abs(cos) / width) ** roundness + (Math.abs(sin) / height) ** roundness
    const radius = denom === 0 ? 0 : 1 / denom ** (1 / roundness)
    points.push([cos * radius * (1 + randRange(random, -jitter, jitter)), sin * radius * (1 + randRange(random, -jitter, jitter))])
  }
  return points
}

interface FaceGeometry { kind: string; points: Point[]; width: number; height: number; tilt: number }

function generateFaceGeometry(random: Random): FaceGeometry {
  const segments = 40
  const egg = generateEggContour(random, segments, randRange(random, 56, 64), randRange(random, 60, 70), 0.028, randRange(random, -0.08, 0.12))
  const box = generateRectContour(random, segments, randRange(random, 54, 64), randRange(random, 56, 68), randRange(random, 3.8, 5.2), 0.028)
  const blend = randRange(random, 0.18, 0.34); const twist = randRange(random, -0.08, 0.08)
  const dx = randRange(random, -4, 4); const dy = randRange(random, -3, 5)
  const kind = pick(FACE_KINDS, random)
  const points = normalizePoints(egg.map((point, index) => {
    const shifted = box[index]
    return translatePoint(rotatePoint([lerp(point[0], shifted[0], blend), lerp(point[1], shifted[1], blend)], twist), dx, dy)
  }))
  const xs = points.map((p) => p[0]); const ys = points.map((p) => p[1])
  return { kind, points, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), tilt: randRange(random, -0.09, 0.09) }
}

interface EyeGeometry { kind: string; upper: Point[]; lower: Point[]; pupil: Point[]; center: Point }

function mirrorEye(eye: EyeGeometry): EyeGeometry {
  return { ...eye, upper: eye.upper.map(([x, y]) => [-x, y] as Point), lower: eye.lower.map(([x, y]) => [-x, y] as Point), pupil: eye.pupil.map(([x, y]) => [-x, y] as Point) }
}

function perturbEye(random: Random, eye: EyeGeometry): EyeGeometry {
  const shiftX = randRange(random, -2.5, 2.5); const shiftY = randRange(random, -2, 2)
  const squeeze = randRange(random, 0.88, 1.12); const lift = randRange(random, -4, 4)
  const t = (point: Point): Point => [formatNumber(point[0] * squeeze + shiftX), formatNumber(point[1] + shiftY + lift * (point[0] / 28))]
  return { ...eye, upper: eye.upper.map(t), lower: eye.lower.map(t), pupil: eye.pupil.map(t) }
}

function generateSingleEye(random: Random, width: number): Omit<EyeGeometry, 'center'> {
  const kind = pick(EYE_KINDS, random)
  const lidHeight = randRange(random, width * 0.18, width * 0.4); const underbite = randRange(random, width * 0.12, width * 0.32)
  const droop = randRange(random, -4, 10); const pinch = randRange(random, -5, 5)
  const p0: Point = [-width / 2, randRange(random, -2, 2)]; const p3: Point = [width / 2, randRange(random, -2, 2)]
  const upper = cubicBezier(p0, [p0[0] + randRange(random, 6, width / 2), -lidHeight + droop], [p3[0] - randRange(random, 6, width / 2), -lidHeight - pinch], p3, 12)
  const lower = cubicBezier(p3, [p3[0] - randRange(random, 8, width / 2), underbite + randRange(random, -3, 8)], [p0[0] + randRange(random, 8, width / 2), underbite + randRange(random, -3, 8)], p0, 12)
  const pupil: Point[] = Array.from({ length: 6 }, () => [formatNumber(randRange(random, -width * 0.12, width * 0.12)), formatNumber(randRange(random, -width * 0.08, width * 0.1))])
  return { kind, upper, lower, pupil }
}

function generateEyeGeometry(random: Random, faceGeometry: FaceGeometry): { left: EyeGeometry; right: EyeGeometry } {
  const baseWidth = randRange(random, faceGeometry.width * 0.18, faceGeometry.width * 0.26)
  const leftBase = generateSingleEye(random, baseWidth)
  const right = perturbEye(random, mirrorEye({ ...leftBase, center: [0, 0] }))
  const distance = randRange(random, faceGeometry.width * 0.17, faceGeometry.width * 0.23)
  const y = randRange(random, -faceGeometry.height * 0.06, -faceGeometry.height * 0.14)
  return {
    left: { ...leftBase, center: [-distance, y + randRange(random, -4, 4)] },
    right: { ...right, center: [distance + randRange(random, -3, 5), y + randRange(random, -4, 5)] },
  }
}

interface MouthGeometry { kind: string; tilt: number; center: Point; points: Point[] }

function generateMouthGeometry(random: Random, faceGeometry: FaceGeometry): MouthGeometry {
  const kind = pick(MOUTH_KINDS, random)
  const width = randRange(random, faceGeometry.width * 0.28, faceGeometry.width * 0.46)
  const height = randRange(random, 10, 28); const y = randRange(random, faceGeometry.height * 0.2, faceGeometry.height * 0.32)
  const tilt = randRange(random, -0.3, 0.3)
  let points: Point[]
  if (kind === 'u-smile') {
    points = cubicBezier([-width / 2, 0], [-width * 0.25, height], [width * 0.25, height], [width / 2, randRange(random, -4, 3)], 24)
  } else if (kind === 'tilted-oval') {
    points = Array.from({ length: 28 }, (_, index) => { const angle = (Math.PI * 2 * index) / 28; return [Math.cos(angle) * width * 0.28, Math.sin(angle) * height * 0.55] as Point })
  } else {
    points = [
      ...cubicBezier([-width / 2, randRange(random, -2, 2)], [-width * 0.18, height * 0.75], [width * 0.18, height * 0.55], [width / 2, randRange(random, -2, 4)], 14),
      ...cubicBezier([width / 2, randRange(random, -2, 4)], [width * 0.12, height * 0.15], [-width * 0.16, height * 0.1], [-width / 2, randRange(random, -2, 2)], 14),
    ]
  }
  return { kind, tilt, center: [randRange(random, -8, 8), y], points: points.map((point) => rotatePoint(point, tilt)) }
}

interface NoseGeometry { style: string; left: Point; right: Point; bridgeBend: number }

function generateNoseGeometry(random: Random, faceGeometry: FaceGeometry): NoseGeometry {
  return {
    style: pick(NOSE_STYLES, random),
    left: [randRange(random, -10, -4), randRange(random, faceGeometry.height * 0.02, faceGeometry.height * 0.12)],
    right: [randRange(random, 4, 10), randRange(random, faceGeometry.height * 0.02, faceGeometry.height * 0.12) + randRange(random, -2, 4)],
    bridgeBend: randRange(random, 8, 18),
  }
}

function colorDistance(hexA: string, hexB: string): number {
  const parse = (hex: string) => [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)]
  const [ar, ag, ab] = parse(hexA); const [br, bg, bb] = parse(hexB)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function chooseHairColor(random: Random, backgroundFill: string): string {
  const useVivid = random() > 0.82
  const palette = useVivid ? VIVID_HAIR_COLORS : NATURAL_HAIR_COLORS
  let color = pick(palette, random)
  if (useVivid) {
    let attempts = 0
    while (attempts < 10 && colorDistance(color, backgroundFill) < 90) { color = pick(palette, random); attempts += 1 }
  }
  return color
}

interface HairLine { points: Point[]; width: number }
interface HairStrip { points: Point[]; opacity: number }

function buildHairLine(random: Random, anchor: Point, sideBias: number, mode: string): HairLine {
  const modeConfig: Record<string, { length: [number, number]; bend: [number, number]; maxDistance: number }> = {
    burst: { length: [22, 44], bend: [10, 20], maxDistance: 42 }, frizz: { length: [16, 34], bend: [14, 24], maxDistance: 34 },
    sweep: { length: [18, 40], bend: [16, 26], maxDistance: 38 }, split: { length: [16, 38], bend: [14, 22], maxDistance: 36 },
    halo: { length: [10, 22], bend: [4, 10], maxDistance: 22 }, curtain: { length: [18, 38], bend: [8, 14], maxDistance: 34 },
    cowlick: { length: [14, 30], bend: [16, 28], maxDistance: 28 }, buzz: { length: [6, 12], bend: [1, 4], maxDistance: 14 },
    sparse: { length: [8, 18], bend: [3, 8], maxDistance: 18 }, sidepart: { length: [16, 30], bend: [6, 14], maxDistance: 28 },
    tufts: { length: [10, 22], bend: [8, 16], maxDistance: 22 },
  }
  const cfg = modeConfig[mode]
  const segments = randInt(random, 3, 6); const totalLength = randRange(random, cfg.length[0], cfg.length[1])
  const bend = randRange(random, cfg.bend[0], cfg.bend[1]) * sideBias; const angleBase = -Math.PI / 2 + randRange(random, -0.55, 0.55)
  const points: Point[] = [anchor]; let current = anchor
  for (let step = 1; step <= segments; step += 1) {
    const portion = step / segments
    const haloCurve = mode === 'halo' ? Math.sin(portion * Math.PI) * sideBias * 0.12 : 0
    const curtainPull = mode === 'curtain' ? sideBias * 0.12 - portion * 0.05 * sideBias : 0
    const cowlickFlick = mode === 'cowlick' ? (step < segments / 2 ? -0.26 : 0.34) * sideBias : 0
    const sidepartSweep = mode === 'sidepart' ? (sideBias > 0 ? 0.22 : -0.08) - portion * 0.03 * sideBias : 0
    const tuftKick = mode === 'tufts' ? Math.sin(portion * Math.PI) * (random() > 0.5 ? 0.28 : -0.24) : 0
    const localAngle = angleBase + randRange(random, -0.25, 0.25) +
      (mode === 'sweep' ? sideBias * 0.28 : 0) + (mode === 'split' ? (step < segments / 2 ? -0.18 : 0.18) * sideBias : 0) +
      haloCurve + curtainPull + cowlickFlick + sidepartSweep + tuftKick
    const x = current[0] + Math.cos(localAngle) * (totalLength / segments) + bend * portion * (mode === 'halo' || mode === 'buzz' ? 0.08 : 0.2) + randRange(random, -3, 3)
    const y = current[1] + Math.sin(localAngle) * (totalLength / segments) - randRange(random, 0, 4) - portion * randRange(random, 1, mode === 'curtain' ? 2.5 : mode === 'buzz' ? 1.8 : 4) + (mode === 'halo' ? portion * 6 : 0) + (mode === 'sidepart' ? portion * 1.2 : 0)
    const nextPoint: Point = [x, y]
    const dist = Math.hypot(nextPoint[0] - anchor[0], nextPoint[1] - anchor[1])
    if (dist > cfg.maxDistance) {
      const ratio = cfg.maxDistance / dist
      current = [formatNumber(anchor[0] + (nextPoint[0] - anchor[0]) * ratio), formatNumber(anchor[1] + (nextPoint[1] - anchor[1]) * ratio)]
    } else { current = [formatNumber(x), formatNumber(y)] }
    points.push(current)
  }
  return { points, width: formatNumber(randRange(random, 0.9, 2.8)) }
}

function buildHairStrip(random: Random, lineA: HairLine, lineB: HairLine): HairStrip | null {
  const length = Math.min(lineA.points.length, lineB.points.length)
  if (length < 4) return null
  const start = randInt(random, 0, Math.max(0, length - 4)); const span = randInt(random, 3, Math.min(6, length - start))
  const upper = lineA.points.slice(start, start + span); const lower = lineB.points.slice(start, start + span).reverse()
  if (upper.length < 3 || lower.length < 3) return null
  return { points: [...upper, ...lower], opacity: formatNumber(randRange(random, 0.16, 0.34)) }
}

function generateHairGeometry(random: Random, faceGeometry: FaceGeometry, backgroundFill: string) {
  const mode = pick(HAIR_MODES, random); const hairColor = chooseHairColor(random, backgroundFill)
  const topHalf = faceGeometry.points.filter((p) => p[1] < -faceGeometry.height * 0.05)
  const topArc = topHalf.length > 0 ? topHalf : faceGeometry.points.slice(0, Math.ceil(faceGeometry.points.length / 2))
  const sideArc = faceGeometry.points.filter((p) => p[1] < faceGeometry.height * 0.08 && Math.abs(p[0]) > faceGeometry.width * 0.16)
  const crownArc = topArc.filter((p) => Math.abs(p[0]) < faceGeometry.width * 0.2)
  const partArc = topArc.filter((p) => p[0] > -faceGeometry.width * 0.05)
  const anchors = mode === 'curtain' ? (sideArc.length > 0 ? sideArc : topArc) : mode === 'sidepart' ? (partArc.length > 0 ? partArc : topArc) : mode === 'cowlick' ? (crownArc.length > 0 ? crownArc : topArc) : topArc
  const count = mode === 'halo' ? randInt(random, 32, 88) : mode === 'curtain' ? randInt(random, 24, 72) : mode === 'cowlick' ? randInt(random, 20, 56) : mode === 'buzz' ? randInt(random, 42, 96) : mode === 'sparse' ? randInt(random, 6, 18) : mode === 'sidepart' ? randInt(random, 20, 44) : mode === 'tufts' ? randInt(random, 8, 22) : randInt(random, 20, 120)
  const lines: HairLine[] = []
  for (let index = 0; index < count; index += 1) {
    const anchor = anchors[randInt(random, 0, anchors.length - 1)]
    const sideBias = anchor[0] === 0 ? (random() > 0.5 ? 1 : -1) : Math.sign(anchor[0])
    lines.push(buildHairLine(random, anchor, sideBias, mode))
  }
  const strips: HairStrip[] = []
  for (let index = 1; index < lines.length; index += 1) {
    if (random() > 0.58) continue
    const strip = buildHairStrip(random, lines[index - 1], lines[index])
    if (strip) strips.push(strip)
  }
  return { mode, color: hairColor, lines, strips }
}

interface AvatarState {
  backgroundIndex: number
  faceGeometry: FaceGeometry
  eyeGeometryLeft: EyeGeometry
  eyeGeometryRight: EyeGeometry
  mouthGeometry: MouthGeometry
  noseGeometry: NoseGeometry
  hairMode: string
  hairColor: string
  hairLines: HairLine[]
  hairStrips: HairStrip[]
  noise: { enabled: boolean; frequency: number; octaves: number; scale: number }
  accessory: string
}

function createRandomState(random: Random): AvatarState {
  const backgroundIndex = randInt(random, 0, AUTO_BACKGROUNDS.length - 1)
  const backgroundFill = AUTO_BACKGROUNDS[backgroundIndex]
  const faceGeometry = generateFaceGeometry(random)
  const eyes = generateEyeGeometry(random, faceGeometry)
  const mouthGeometry = generateMouthGeometry(random, faceGeometry)
  const noseGeometry = generateNoseGeometry(random, faceGeometry)
  const hair = generateHairGeometry(random, faceGeometry, backgroundFill)
  return {
    backgroundIndex, faceGeometry, eyeGeometryLeft: eyes.left, eyeGeometryRight: eyes.right,
    mouthGeometry, noseGeometry, hairMode: hair.mode, hairColor: hair.color, hairLines: hair.lines, hairStrips: hair.strips,
    noise: { enabled: random() > 0.38, frequency: formatNumber(randRange(random, 0.018, 0.045)), octaves: randInt(random, 1, 3), scale: formatNumber(randRange(random, 0.8, 2.2)) },
    accessory: pick(ACCESSORY_VARIANTS, random),
  }
}

function renderAccessory(state: AvatarState): string {
  if (state.accessory === 'glasses') return `<rect x="88" y="103" width="32" height="24" rx="10" fill="none" stroke="#3d312b" stroke-width="4"/><rect x="136" y="103" width="32" height="24" rx="10" fill="none" stroke="#3d312b" stroke-width="4"/><path d="M120 115h16" stroke="#3d312b" stroke-width="4" stroke-linecap="round"/>`
  if (state.accessory === 'blush') return `<ellipse cx="91" cy="145" rx="14" ry="8" fill="#ef8fa5" opacity="0.5"/><ellipse cx="166" cy="147" rx="13" ry="7" fill="#ef8fa5" opacity="0.45"/>`
  if (state.accessory === 'mole') return `<circle cx="167" cy="151" r="3.2" fill="#4d342d"/>`
  return ''
}

function renderEyes(state: AvatarState): string {
  const renderPupilMarks = (eye: EyeGeometry) => eye.pupil.map((point, index) =>
    `<circle cx="${formatNumber(point[0])}" cy="${formatNumber(point[1])}" r="${formatNumber(index % 2 === 0 ? 3.5 : 2.6)}" fill="none" stroke="#15110f" stroke-width="1.1"/>`
  ).join('')
  const renderEye = (eye: EyeGeometry) => {
    const outline = [...eye.upper, ...eye.lower]
    return `<g transform="translate(${formatNumber(128 + eye.center[0])} ${formatNumber(118 + eye.center[1])})"><path d="${pathFromPoints(outline)}" fill="#fffaf6" stroke="#201713" stroke-width="3.1" stroke-linejoin="round"/><path d="${pathFromPoints(eye.upper, false)}" fill="none" stroke="#201713" stroke-width="3.7" stroke-linecap="round"/><path d="${pathFromPoints(eye.lower, false)}" fill="none" stroke="#201713" stroke-width="3" stroke-linecap="round"/>${renderPupilMarks(eye)}</g>`
  }
  return `${renderEye(state.eyeGeometryLeft)}${renderEye(state.eyeGeometryRight)}`
}

function renderNose(state: AvatarState): string {
  const { noseGeometry } = state
  if (state.noseGeometry.style === 'dots') {
    return Array.from({ length: 5 }, (_, index) => {
      const t = index / 4
      return `<circle cx="${formatNumber(128 + lerp(noseGeometry.left[0] - 1.5, noseGeometry.left[0] + 1.5, t))}" cy="${formatNumber(132 + noseGeometry.left[1] + t)}" r="1.8" fill="none" stroke="#3b2a24" stroke-width="0.9"/><circle cx="${formatNumber(128 + lerp(noseGeometry.right[0] - 1.5, noseGeometry.right[0] + 1.5, t))}" cy="${formatNumber(132 + noseGeometry.right[1] + t)}" r="1.8" fill="none" stroke="#3b2a24" stroke-width="0.9"/>`
    }).join('')
  }
  return `<path d="M${formatNumber(128 + noseGeometry.left[0])} ${formatNumber(128 + noseGeometry.left[1])} Q128 ${formatNumber(128 + noseGeometry.bridgeBend)} ${formatNumber(128 + noseGeometry.right[0])} ${formatNumber(130 + noseGeometry.right[1])}" fill="none" stroke="#6e493d" stroke-width="3.3" stroke-linecap="round"/>`
}

function renderMouth(state: AvatarState): string {
  const { center, points, kind } = state.mouthGeometry
  const translated = points.map((point) => [128 + center[0] + point[0], 148 + center[1] + point[1]] as Point)
  if (kind === 'u-smile') return `<path d="${pathFromPoints(translated, false)}" fill="none" stroke="#6d1d22" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`
  return `<path d="${pathFromPoints(translated)}" fill="#c86f7e" stroke="#6d1d22" stroke-width="3.2" stroke-linejoin="round"/>`
}

export function renderAvatarSvg(state: AvatarState, { size, background }: { size: number; background: string }): string {
  const backgroundFill = background === 'auto' ? AUTO_BACKGROUNDS[state.backgroundIndex] : (BACKGROUND_PRESETS[background] ?? AUTO_BACKGROUNDS[0])
  const facePoints = state.faceGeometry.points.map((p) => [128 + p[0], 128 + p[1]] as Point)
  const noiseFilter = state.noise.enabled ? ` filter="url(#ugly-avatar-noise)"` : ''
  const noiseDefs = state.noise.enabled
    ? `<defs><filter id="ugly-avatar-noise" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence baseFrequency="${state.noise.frequency}" numOctaves="${state.noise.octaves}" type="noise" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="${state.noise.scale}"/></filter></defs>`
    : ''
  const hairLines = state.hairLines.map((line) => `<polyline points="${polylinePoints(line.points.map((p) => [128 + p[0], 110 + p[1]] as Point))}" fill="none" stroke="${state.hairColor}" stroke-width="${line.width}" stroke-linecap="round" stroke-linejoin="round"${noiseFilter}/>`).join('')
  const hairStrips = state.hairStrips.map((strip) => `<path d="${pathFromPoints(strip.points.map((p) => [128 + p[0], 110 + p[1]] as Point))}" fill="${state.hairColor}" opacity="${strip.opacity}"${noiseFilter}/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${AVATAR_VIEWBOX_SIZE} ${AVATAR_VIEWBOX_SIZE}" role="img" aria-label="Ugly avatar">${noiseDefs}<rect width="256" height="256" fill="${backgroundFill}"/><g transform="translate(0 ${AVATAR_Y_OFFSET})"><g transform="rotate(${formatNumber(state.faceGeometry.tilt * 180 / Math.PI)} 128 128)"><g data-hair-mode="${state.hairMode}">${hairStrips}${hairLines}</g><path d="${pathFromPoints(facePoints)}" fill="#f1b39a" stroke="#4b342d" stroke-width="4"${noiseFilter}/>${renderAccessory(state)}${renderEyes(state)}${renderNose(state)}${renderMouth(state)}</g></g></svg>`
}

export interface AvatarResult {
  svg: string
  dataUrl: string
  size: number
  state: AvatarState
}

export function generateAvatar({ size = 256, background = 'auto', random = Math.random }: { size?: number; background?: string; random?: Random } = {}): AvatarResult {
  const state = createRandomState(random)
  const svg = renderAvatarSvg(state, { size, background })
  return { svg, dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, size, state }
}

export { BACKGROUND_PRESETS, AUTO_BACKGROUNDS }
export const _clamp = clamp
