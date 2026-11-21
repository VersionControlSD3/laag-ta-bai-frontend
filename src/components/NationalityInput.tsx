import { useEffect, useId, useState, type ComponentProps, type KeyboardEvent } from 'react'
import { CheckmarkIcon, ChevronForwardOutlineIcon, GlobeOutlineIcon } from '@/components/icons/ionicons'
import { nationalityOptions } from '@/lib/nationality'

type NationalityInputProps = Pick<ComponentProps<'input'>, 'id' | 'required' | 'aria-invalid' | 'aria-describedby'> & {
  value: string
  onValueChange: (value: string) => void
  compact?: boolean
}

export function NationalityInput({ value, onValueChange, compact, ...props }: NationalityInputProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [filtering, setFiltering] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const query = filtering ? value.trim().toLowerCase() : ''
  const options = query ? nationalityOptions.filter((name) => name.toLowerCase().includes(query)) : nationalityOptions
  const activeId = open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  function close() {
    setOpen(false)
    setFiltering(false)
    setActiveIndex(-1)
  }

  function select(name: string) {
    onValueChange(name)
    close()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const down = event.key === 'ArrowDown'
      setActiveIndex((index) => down
        ? Math.min(index + 1, options.length - 1)
        : index < 0 ? options.length - 1 : Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && activeId) {
      event.preventDefault()
      select(options[activeIndex])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <GlobeOutlineIcon size={18} className="pointer-events-none absolute left-4 text-terracotta" />
        <input
          {...props}
          name="nationality"
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeId}
          placeholder="Search countries"
          value={value}
          onClick={() => setOpen(true)}
          onBlur={close}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onValueChange(event.target.value)
            setFiltering(true)
            setActiveIndex(-1)
            setOpen(true)
          }}
          className={`w-full rounded-2xl border bg-ivory-surface px-11 text-base font-normal tracking-normal text-ink normal-case placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-navy ${compact ? 'h-12' : 'h-14'} ${props['aria-invalid'] ? 'border-danger' : 'border-line-strong'}`}
        />
        <ChevronForwardOutlineIcon
          size={18}
          className={`pointer-events-none absolute right-4 text-ink-muted ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-ivory-line bg-ivory-surface text-base font-normal tracking-normal normal-case shadow-lg">
          <ul id={listId} role="listbox" aria-label="Countries" className="max-h-60 overflow-y-auto overscroll-contain">
            {options.map((name, index) => {
              const selected = name === value
              return (
                <li
                  key={name}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(name)}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-2 border-b border-ivory-line px-4 py-2 text-ink last:border-b-0 hover:bg-sage-soft ${index === activeIndex ? 'bg-sage-soft' : ''}`}
                >
                  {name}
                  {selected && <CheckmarkIcon size={18} className="shrink-0 text-navy" />}
                </li>
              )
            })}
          </ul>
          {options.length === 0 && <p role="status" className="px-4 py-3 text-sm text-ink-muted">No matching countries</p>}
        </div>
      )}
    </div>
  )
}
