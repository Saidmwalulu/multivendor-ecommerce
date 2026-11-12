"use client"

import * as React from "react"
import { Check, ListFilter } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface SelectableInputItem {
  value: string
  label: string
}

interface SelectableInputTriggerProps {
  disabled?: boolean
}

// Renders the trigger's own native <button> directly, styled to look like a
// Button, instead of nesting a separate <Button> inside PopoverTrigger
// asChild — which can produce a button-inside-button hydration error
// depending on the installed Popover primitive.
function SelectableInputTrigger({ disabled }: SelectableInputTriggerProps) {
  return (
    <PopoverTrigger
      type="button"
      disabled={disabled}
      aria-label="Open options"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "absolute right-0 h-9 w-9 text-muted-foreground hover:text-foreground"
      )}
    >
      <ListFilter className="h-4 w-4" />
    </PopoverTrigger>
  )
}

interface SelectableInputProps {
  items: SelectableInputItem[]
  /** Value shown initially. Only changes via selecting from the list. */
  defaultValue: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyText?: string
  searchPlaceholder?: string
}

export function SelectableInput({
  items,
  defaultValue,
  onValueChange,
  placeholder = "Select a value",
  disabled = false,
  className,
  emptyText = "No results found.",
  searchPlaceholder = "Search...",
}: SelectableInputProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue)

  // defaultValue can arrive after the initial render — e.g. an edit form
  // where the record loads asynchronously and populates the field late.
  // Resync so the field reflects it once it shows up.
  React.useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const selectedLabel =
    items.find((item) => item.value === value)?.label ?? value

  function handleSelect(itemValue: string) {
    setValue(itemValue)
    onValueChange?.(itemValue)
    setOpen(false)
  }

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <Input
        readOnly
        value={selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pr-10 cursor-default caret-transparent"
        onClick={() => !disabled && setOpen(true)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <SelectableInputTrigger disabled={disabled} />
        <PopoverContent className="w-[240px] p-0" align="end">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.label}
                    onSelect={() => handleSelect(item.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
