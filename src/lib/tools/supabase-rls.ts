export type RlsTemplateId =
  | 'ownRows'
  | 'publicReadOwnWrite'
  | 'authenticatedCrud'
  | 'publicReadOnly'
  | 'insertOnlyOwnRows'

export type RlsRole = 'anon' | 'authenticated'

export interface RlsGeneratorInput {
  schema: string
  tableName: string
  ownerColumn: string
  role: RlsRole
  templateId: RlsTemplateId
  includeEnableRls: boolean
  includeComments: boolean
  useOptimizedAuthUid: boolean
  policyNamePrefix: string
}

export type RlsValidationErrors = Partial<Record<'schema' | 'tableName' | 'ownerColumn' | 'role' | 'templateId', string>>

interface PolicySpec {
  action: 'select' | 'insert' | 'update' | 'delete'
  name: string
  roles: RlsRole[]
  using?: string
  withCheck?: string
}

export const RLS_TEMPLATES: Array<{
  id: RlsTemplateId
  labelKey: string
  descriptionKey: string
}> = [
  { id: 'ownRows', labelKey: 'ownRows', descriptionKey: 'ownRowsDescription' },
  { id: 'publicReadOwnWrite', labelKey: 'publicReadOwnWrite', descriptionKey: 'publicReadOwnWriteDescription' },
  { id: 'authenticatedCrud', labelKey: 'authenticatedCrud', descriptionKey: 'authenticatedCrudDescription' },
  { id: 'publicReadOnly', labelKey: 'publicReadOnly', descriptionKey: 'publicReadOnlyDescription' },
  { id: 'insertOnlyOwnRows', labelKey: 'insertOnlyOwnRows', descriptionKey: 'insertOnlyOwnRowsDescription' },
]

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export function validateRlsInput(input: RlsGeneratorInput): RlsValidationErrors {
  const errors: RlsValidationErrors = {}
  if (!input.schema.trim()) errors.schema = 'Schema is required'
  else if (!IDENTIFIER_RE.test(input.schema.trim())) errors.schema = 'Use a simple PostgreSQL identifier'

  if (!input.tableName.trim()) errors.tableName = 'Table name is required'
  else if (!IDENTIFIER_RE.test(input.tableName.trim())) errors.tableName = 'Use a simple PostgreSQL identifier'

  if (!input.ownerColumn.trim()) errors.ownerColumn = 'Owner column is required'
  else if (!IDENTIFIER_RE.test(input.ownerColumn.trim())) errors.ownerColumn = 'Use a simple PostgreSQL identifier'

  if (!['anon', 'authenticated'].includes(input.role)) errors.role = 'Unsupported role'
  if (!RLS_TEMPLATES.some((template) => template.id === input.templateId)) errors.templateId = 'Unsupported template'

  return errors
}

export function generateRlsPolicySql(input: RlsGeneratorInput): string {
  const errors = validateRlsInput(input)
  if (Object.keys(errors).length > 0) {
    throw new Error('Invalid RLS generator input')
  }

  const normalized = normalizeInput(input)
  const tableRef = `${normalized.schema}.${normalized.tableName}`
  const authUid = normalized.useOptimizedAuthUid ? '(select auth.uid())' : 'auth.uid()'
  const ownerExpression = `${authUid} = ${normalized.ownerColumn}`
  const policies = getPolicySpecs(normalized, ownerExpression)
  const blocks: string[] = []

  if (normalized.includeEnableRls) {
    if (normalized.includeComments) blocks.push('-- Enable Row Level Security')
    blocks.push(`alter table ${tableRef} enable row level security;`)
  }

  for (const policy of policies) {
    if (normalized.includeComments) blocks.push(`-- ${policy.name}`)
    blocks.push(formatPolicy(tableRef, normalized.policyNamePrefix, policy))
  }

  if (normalized.includeComments) {
    blocks.push('-- Review and test these starter policies before running them in production.')
  }

  return blocks.join('\n\n')
}

function normalizeInput(input: RlsGeneratorInput): RlsGeneratorInput {
  return {
    ...input,
    schema: input.schema.trim(),
    tableName: input.tableName.trim(),
    ownerColumn: input.ownerColumn.trim(),
    policyNamePrefix: input.policyNamePrefix.trim(),
  }
}

function getPolicySpecs(input: RlsGeneratorInput, ownerExpression: string): PolicySpec[] {
  const ownCrud: PolicySpec[] = [
    { action: 'select', name: `Users can view their own ${input.tableName}`, roles: [input.role], using: ownerExpression },
    { action: 'insert', name: `Users can insert their own ${input.tableName}`, roles: [input.role], withCheck: ownerExpression },
    { action: 'update', name: `Users can update their own ${input.tableName}`, roles: [input.role], using: ownerExpression, withCheck: ownerExpression },
    { action: 'delete', name: `Users can delete their own ${input.tableName}`, roles: [input.role], using: ownerExpression },
  ]

  if (input.templateId === 'ownRows') return ownCrud
  if (input.templateId === 'publicReadOwnWrite') {
    return [
      { action: 'select', name: `Anyone can view ${input.tableName}`, roles: ['anon', 'authenticated'], using: 'true' },
      ...ownCrud.filter((policy) => policy.action !== 'select').map((policy) => ({ ...policy, roles: ['authenticated' as const] })),
    ]
  }
  if (input.templateId === 'authenticatedCrud') {
    return [
      { action: 'select', name: `Authenticated users can view ${input.tableName}`, roles: ['authenticated'], using: 'true' },
      { action: 'insert', name: `Authenticated users can insert ${input.tableName}`, roles: ['authenticated'], withCheck: 'true' },
      { action: 'update', name: `Authenticated users can update ${input.tableName}`, roles: ['authenticated'], using: 'true', withCheck: 'true' },
      { action: 'delete', name: `Authenticated users can delete ${input.tableName}`, roles: ['authenticated'], using: 'true' },
    ]
  }
  if (input.templateId === 'publicReadOnly') {
    return [{ action: 'select', name: `Anyone can view ${input.tableName}`, roles: ['anon', 'authenticated'], using: 'true' }]
  }
  return [
    { action: 'insert', name: `Users can insert their own ${input.tableName}`, roles: [input.role], withCheck: ownerExpression },
  ]
}

function formatPolicy(tableRef: string, prefix: string, policy: PolicySpec): string {
  const policyName = prefix ? `${prefix} ${policy.name}` : policy.name
  const lines = [
    `create policy "${policyName}"`,
    `on ${tableRef}`,
    `for ${policy.action}`,
    `to ${policy.roles.join(', ')}`,
  ]

  if (policy.using) lines.push(formatExpression('using', policy.using))
  if (policy.withCheck) lines.push(formatExpression('with check', policy.withCheck))

  return `${lines.join('\n')};`
}

function formatExpression(keyword: 'using' | 'with check', expression: string): string {
  if (expression === 'true') return `${keyword} (true)`
  return `${keyword} (\n  ${expression}\n)`
}
