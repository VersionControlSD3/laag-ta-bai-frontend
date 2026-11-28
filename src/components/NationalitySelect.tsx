import type { ComponentProps } from 'react'
import { ChevronForwardOutlineIcon } from '@/components/icons/ionicons'
import { useT } from '@/i18n'
import { nationalityOptions } from '@/lib/nationality'

type NationalitySelectProps = Pick<
  ComponentProps<'select'>,
  'id' | 'required' | 'className' | 'autoComplete' | 'aria-invalid' | 'aria-describedby'
> & {
  value: string
  savedValue?: string
  onValueChange: (value: string) => void
}

export function NationalitySelect({
  value,
  savedValue,
  onValueChange,
  className,
  ...props
}: NationalitySelectProps) {
  const t = useT()
  const legacyValue = savedValue && !nationalityOptions.includes(savedValue) ? savedValue : null

  return (
    <div className="relative w-full min-w-0">
      <select
        {...props}
        name="nationality"
        value={value}
        data-empty={value === ''}
        onChange={(event) => onValueChange(event.target.value)}
        className={`block min-w-0 appearance-none truncate pr-10 data-[empty=true]:text-ink-muted forced-colors:appearance-auto ${className ?? ''}`}
      >
        <option value="" disabled={props.required}>
          {props.required ? t.common.nationality.select : t.common.nationality.none}
        </option>
        {legacyValue && <option value={legacyValue} className="[color:FieldText]">{legacyValue}</option>}
        {nationalityOptions.map((name) => <option key={name} value={name} className="[color:FieldText]">{name}</option>)}
      </select>
      <ChevronForwardOutlineIcon
        size={16}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rotate-90 forced-colors:hidden"
        aria-hidden="true"
      />
    </div>
  )
}
