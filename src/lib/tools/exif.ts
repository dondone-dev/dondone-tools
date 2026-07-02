import exifr from 'exifr'

export interface ExifField {
  labelKey: string
  value: string
}

export interface ExifSection {
  id: 'camera' | 'exposure' | 'datetime' | 'gps' | 'image'
  fields: ExifField[]
}

export interface ParsedExif {
  sections: ExifSection[]
  previewSrc?: string
  gps?: { lat: number; lon: number }
}

function fmt(val: unknown): string | null {
  if (val === undefined || val === null) return null
  return String(val)
}

function fmtExposureTime(val: number): string {
  if (val >= 1) return `${val}s`
  const denom = Math.round(1 / val)
  return `1/${denom}s`
}

function fmtFNumber(val: number): string {
  return `f/${val}`
}

function fmtFocalLength(val: number): string {
  return `${val}mm`
}

function fmtAltitude(val: number): string {
  return `${val.toFixed(1)}m`
}

function fmtCoordinate(val: number, pos: string, neg: string): string {
  const dir = val >= 0 ? pos : neg
  const abs = Math.abs(val)
  return `${abs.toFixed(6)}° ${dir}`
}

function fmtOrientation(val: number): string {
  const map: Record<number, string> = {
    1: '0°', 3: '180°', 6: '90° CW', 8: '90° CCW',
  }
  return map[val] ?? String(val)
}

function fmtFlash(val: number): string {
  return (val & 1) ? 'Fired' : 'Did not fire'
}

function fmtExposureMode(val: number): string {
  return ['Auto', 'Manual', 'Auto bracket'][val] ?? String(val)
}

function fmtWhiteBalance(val: number): string {
  return val === 0 ? 'Auto' : 'Manual'
}

function fmtMeteringMode(val: number): string {
  return ['Unknown', 'Average', 'Center-weighted', 'Spot', 'Multi-spot', 'Pattern', 'Partial'][val] ?? String(val)
}

function fmtColorSpace(val: number): string {
  return val === 1 ? 'sRGB' : val === 65535 ? 'Uncalibrated' : String(val)
}

function fmtDateTime(val: Date | string): string {
  if (val instanceof Date) {
    const Y = val.getFullYear()
    const M = String(val.getMonth() + 1).padStart(2, '0')
    const D = String(val.getDate()).padStart(2, '0')
    const h = String(val.getHours()).padStart(2, '0')
    const m = String(val.getMinutes()).padStart(2, '0')
    const s = String(val.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  }
  return String(val)
}

export async function parseExif(file: File): Promise<ParsedExif | null> {
  const raw = await exifr.parse(file, {
    tiff: true,
    exif: true,
    gps: true,
    ifd1: false,
    mergeOutput: true,
    translateValues: false,
    reviveValues: true,
  })

  if (!raw || typeof raw !== 'object') return null

  const sections: ExifSection[] = []

  const cameraFields: ExifField[] = []
  if (fmt(raw.Make)) cameraFields.push({ labelKey: 'make', value: fmt(raw.Make)! })
  if (fmt(raw.Model)) cameraFields.push({ labelKey: 'model', value: fmt(raw.Model)! })
  if (fmt(raw.LensModel)) cameraFields.push({ labelKey: 'lens', value: fmt(raw.LensModel)! })
  if (fmt(raw.Software)) cameraFields.push({ labelKey: 'software', value: fmt(raw.Software)! })
  if (cameraFields.length) sections.push({ id: 'camera', fields: cameraFields })

  const exposureFields: ExifField[] = []
  if (raw.ExposureTime != null) exposureFields.push({ labelKey: 'exposureTime', value: fmtExposureTime(Number(raw.ExposureTime)) })
  if (raw.FNumber != null) exposureFields.push({ labelKey: 'fNumber', value: fmtFNumber(Number(raw.FNumber)) })
  if (raw.ISOSpeedRatings != null) exposureFields.push({ labelKey: 'iso', value: String(raw.ISOSpeedRatings) })
  if (raw.FocalLength != null) exposureFields.push({ labelKey: 'focalLength', value: fmtFocalLength(Number(raw.FocalLength)) })
  if (raw.Flash != null) exposureFields.push({ labelKey: 'flash', value: fmtFlash(Number(raw.Flash)) })
  if (raw.ExposureMode != null) exposureFields.push({ labelKey: 'exposureMode', value: fmtExposureMode(Number(raw.ExposureMode)) })
  if (raw.MeteringMode != null) exposureFields.push({ labelKey: 'meteringMode', value: fmtMeteringMode(Number(raw.MeteringMode)) })
  if (raw.WhiteBalance != null) exposureFields.push({ labelKey: 'whiteBalance', value: fmtWhiteBalance(Number(raw.WhiteBalance)) })
  if (exposureFields.length) sections.push({ id: 'exposure', fields: exposureFields })

  const dateFields: ExifField[] = []
  if (raw.DateTimeOriginal) dateFields.push({ labelKey: 'dateTimeOriginal', value: fmtDateTime(raw.DateTimeOriginal) })
  if (raw.CreateDate) dateFields.push({ labelKey: 'createDate', value: fmtDateTime(raw.CreateDate) })
  if (raw.ModifyDate) dateFields.push({ labelKey: 'modifyDate', value: fmtDateTime(raw.ModifyDate) })
  if (dateFields.length) sections.push({ id: 'datetime', fields: dateFields })

  const imageFields: ExifField[] = []
  if (raw.ImageWidth != null) imageFields.push({ labelKey: 'width', value: String(raw.ImageWidth) + 'px' })
  if (raw.ImageHeight != null) imageFields.push({ labelKey: 'height', value: String(raw.ImageHeight) + 'px' })
  if (raw.ExifImageWidth != null && raw.ImageWidth == null) imageFields.push({ labelKey: 'width', value: String(raw.ExifImageWidth) + 'px' })
  if (raw.ExifImageHeight != null && raw.ImageHeight == null) imageFields.push({ labelKey: 'height', value: String(raw.ExifImageHeight) + 'px' })
  if (raw.Orientation != null) imageFields.push({ labelKey: 'orientation', value: fmtOrientation(Number(raw.Orientation)) })
  if (raw.ColorSpace != null) imageFields.push({ labelKey: 'colorSpace', value: fmtColorSpace(Number(raw.ColorSpace)) })
  if (imageFields.length) sections.push({ id: 'image', fields: imageFields })

  let gps: ParsedExif['gps'] | undefined
  const gpsFields: ExifField[] = []
  if (raw.latitude != null && raw.longitude != null) {
    const lat = Number(raw.latitude)
    const lon = Number(raw.longitude)
    gps = { lat, lon }
    gpsFields.push({ labelKey: 'latitude', value: fmtCoordinate(lat, 'N', 'S') })
    gpsFields.push({ labelKey: 'longitude', value: fmtCoordinate(lon, 'E', 'W') })
    if (raw.GPSAltitude != null) gpsFields.push({ labelKey: 'altitude', value: fmtAltitude(Number(raw.GPSAltitude)) })
  }
  if (gpsFields.length) sections.push({ id: 'gps', fields: gpsFields })

  if (!sections.length) return null

  return { sections, gps }
}
