import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, RotateCcw, Wand2 } from 'lucide-react'
import { ToolLayout } from '@/components/layout/ToolLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useClipboard } from '@/hooks/useClipboard'
import {
  RLS_TEMPLATES,
  generateRlsPolicySql,
  validateRlsInput,
  type RlsGeneratorInput,
  type RlsRole,
  type RlsTemplateId,
} from '@/lib/tools/supabase-rls'

const DEFAULT_INPUT: RlsGeneratorInput = {
  schema: 'public',
  tableName: '',
  ownerColumn: 'user_id',
  role: 'authenticated',
  templateId: 'ownRows',
  includeEnableRls: true,
  includeComments: false,
  useOptimizedAuthUid: true,
  policyNamePrefix: '',
}

const EXAMPLE_INPUT: RlsGeneratorInput = {
  ...DEFAULT_INPUT,
  tableName: 'todos',
}

type BooleanField = 'includeEnableRls' | 'includeComments' | 'useOptimizedAuthUid'

export function SupabaseRlsPage() {
  const { t } = useTranslation('tools')
  const [input, setInput] = useState<RlsGeneratorInput>(DEFAULT_INPUT)
  const [showErrors, setShowErrors] = useState(false)
  const { copiedText, copy } = useClipboard()

  const errors = useMemo(() => validateRlsInput(input), [input])
  const hasErrors = Object.keys(errors).length > 0
  const sql = useMemo(() => {
    if (hasErrors) return ''
    return generateRlsPolicySql(input)
  }, [hasErrors, input])

  function updateField<K extends keyof RlsGeneratorInput>(field: K, value: RlsGeneratorInput[K]) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  function toggleField(field: BooleanField) {
    setInput((current) => ({ ...current, [field]: !current[field] }))
  }

  function handleGenerate() {
    setShowErrors(true)
  }

  return (
    <ToolLayout toolId="supabase-rls" category="SQL">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
        <section className="space-y-4 border rounded-md p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('supabase-rls.schema')} error={showErrors ? errors.schema : undefined}>
              <Input value={input.schema} onChange={(event) => updateField('schema', event.target.value)} spellCheck={false} />
            </Field>
            <Field label={t('supabase-rls.tableName')} error={showErrors ? errors.tableName : undefined}>
              <Input
                value={input.tableName}
                onChange={(event) => updateField('tableName', event.target.value)}
                placeholder={t('supabase-rls.tableNamePlaceholder')}
                spellCheck={false}
              />
            </Field>
            <Field label={t('supabase-rls.ownerColumn')} error={showErrors ? errors.ownerColumn : undefined}>
              <Input value={input.ownerColumn} onChange={(event) => updateField('ownerColumn', event.target.value)} spellCheck={false} />
            </Field>
            <Field label={t('supabase-rls.role')} error={showErrors ? errors.role : undefined}>
              <Select value={input.role} onValueChange={(value) => updateField('role', value as RlsRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="authenticated">authenticated</SelectItem>
                  <SelectItem value="anon">anon</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t('supabase-rls.template')} error={showErrors ? errors.templateId : undefined}>
            <Select value={input.templateId} onValueChange={(value) => updateField('templateId', value as RlsTemplateId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RLS_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {t(`supabase-rls.templates.${template.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`supabase-rls.templates.${RLS_TEMPLATES.find((template) => template.id === input.templateId)?.descriptionKey}`)}
            </p>
          </Field>

          <Field label={t('supabase-rls.policyNamePrefix')}>
            <Input
              value={input.policyNamePrefix}
              onChange={(event) => updateField('policyNamePrefix', event.target.value)}
              placeholder={t('supabase-rls.policyNamePrefixPlaceholder')}
              spellCheck={false}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <OptionButton active={input.includeEnableRls} label={t('supabase-rls.includeEnableRls')} onClick={() => toggleField('includeEnableRls')} />
            <OptionButton active={input.useOptimizedAuthUid} label={t('supabase-rls.useOptimizedAuthUid')} onClick={() => toggleField('useOptimizedAuthUid')} />
            <OptionButton active={input.includeComments} label={t('supabase-rls.includeComments')} onClick={() => toggleField('includeComments')} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleGenerate}>
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              {t('supabase-rls.generate')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setInput(EXAMPLE_INPUT); setShowErrors(true) }}>
              {t('supabase-rls.loadExample')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setInput(DEFAULT_INPUT); setShowErrors(false) }}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {t('supabase-rls.reset')}
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{t('supabase-rls.output')}</Label>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" disabled={!sql} onClick={() => copy(sql)}>
              {copiedText === sql ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copiedText === sql ? t('ui.copied', { ns: 'common' }) : t('ui.copy', { ns: 'common' })}
            </Button>
          </div>
          <Textarea
            value={sql || t('supabase-rls.outputPlaceholder')}
            readOnly
            rows={24}
            className="font-mono text-xs resize-y bg-muted/50"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            {t('supabase-rls.safetyNote')}
          </p>
        </section>
      </div>
    </ToolLayout>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function OptionButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant={active ? 'secondary' : 'outline'} className="justify-start text-xs h-auto min-h-8 whitespace-normal" onClick={onClick}>
      {label}
    </Button>
  )
}
