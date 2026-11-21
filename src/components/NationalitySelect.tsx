import type { ComponentProps } from 'react'
import { nationalityOptions } from '@/lib/nationality'

type NationalitySelectProps = Pick<
  ComponentProps<'select'>,
  'id' | 'required' | 'className' | 'aria-invalid' | 'aria-describedby'
> & {
  value: string
  onValueChange: (value: string) => void
}

export function NationalitySelect({ value, onValueChange, ...props }: NationalitySelectProps) {
  return (
    <select
      {...props}
      name="nationality"
      autoComplete="off"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="" disabled={props.required}>
        {props.required ? 'Select nationality' : 'No nationality selected'}
      </option>
      {value && !nationalityOptions.includes(value) && <option value={value} disabled>{value}</option>}
      {nationalityOptions.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
  )
}
