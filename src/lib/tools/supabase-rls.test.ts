import { describe, expect, it } from 'vitest'
import {
  generateRlsPolicySql,
  validateRlsInput,
  type RlsGeneratorInput,
} from './supabase-rls'

const baseInput: RlsGeneratorInput = {
  schema: 'public',
  tableName: 'todos',
  ownerColumn: 'user_id',
  role: 'authenticated',
  templateId: 'ownRows',
  includeEnableRls: true,
  includeComments: false,
  useOptimizedAuthUid: true,
  policyNamePrefix: '',
}

describe('validateRlsInput', () => {
  it('requires a table name', () => {
    expect(validateRlsInput({ ...baseInput, tableName: '' })).toEqual({
      tableName: 'Table name is required',
    })
  })

  it('rejects unsafe identifiers', () => {
    expect(validateRlsInput({ ...baseInput, schema: 'public;drop' })).toHaveProperty('schema')
    expect(validateRlsInput({ ...baseInput, tableName: 'todo-items' })).toHaveProperty('tableName')
    expect(validateRlsInput({ ...baseInput, ownerColumn: 'user id' })).toHaveProperty('ownerColumn')
  })
})

describe('generateRlsPolicySql', () => {
  it('generates owner CRUD policies with optimized auth.uid syntax', () => {
    const sql = generateRlsPolicySql(baseInput)

    expect(sql).toContain('alter table public.todos enable row level security;')
    expect(sql).toContain('for select')
    expect(sql).toContain('for insert')
    expect(sql).toContain('for update')
    expect(sql).toContain('for delete')
    expect(sql).toContain('(select auth.uid()) = user_id')
    expect(sql).toContain('with check')
  })

  it('generates public read and own write policies', () => {
    const sql = generateRlsPolicySql({ ...baseInput, templateId: 'publicReadOwnWrite' })

    expect(sql).toContain('to anon, authenticated')
    expect(sql).toContain('using (true)')
    expect(sql).toContain('to authenticated')
    expect(sql).toContain('(select auth.uid()) = user_id')
  })

  it('generates authenticated CRUD policies with true expressions', () => {
    const sql = generateRlsPolicySql({ ...baseInput, templateId: 'authenticatedCrud' })

    expect(sql).toContain('to authenticated')
    expect(sql).toContain('using (true)')
    expect(sql).toContain('with check (true)')
  })

  it('generates only select for public read only', () => {
    const sql = generateRlsPolicySql({ ...baseInput, templateId: 'publicReadOnly' })

    expect(sql).toContain('for select')
    expect(sql).not.toContain('for insert')
    expect(sql).not.toContain('for update')
    expect(sql).not.toContain('for delete')
  })

  it('generates only insert for insert-only own rows', () => {
    const sql = generateRlsPolicySql({ ...baseInput, templateId: 'insertOnlyOwnRows' })

    expect(sql).not.toContain('for select')
    expect(sql).toContain('for insert')
    expect(sql).not.toContain('for update')
    expect(sql).not.toContain('for delete')
    expect(sql).toContain('with check')
  })

  it('supports plain auth.uid syntax and comments', () => {
    const sql = generateRlsPolicySql({
      ...baseInput,
      includeComments: true,
      useOptimizedAuthUid: false,
    })

    expect(sql).toContain('-- Enable Row Level Security')
    expect(sql).toContain('auth.uid() = user_id')
    expect(sql).not.toContain('(select auth.uid())')
  })

  it('omits enable RLS when disabled and applies policy name prefix', () => {
    const sql = generateRlsPolicySql({
      ...baseInput,
      includeEnableRls: false,
      policyNamePrefix: 'App',
    })

    expect(sql).not.toContain('enable row level security')
    expect(sql).toContain('create policy "App Users can view their own todos"')
  })
})
