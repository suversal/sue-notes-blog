'use client'

import type { RefObject } from 'react'
import { Drawer } from '@base-ui/react/drawer'
import { Select } from '@base-ui/react/select'
import styles from './archive-select.module.css'

type ArchiveSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export function ArchiveSelect({
  label,
  value,
  options,
  onChange,
  portalContainer,
  active = false,
}: {
  label: string
  value: string
  options: ArchiveSelectOption[]
  onChange: (value: string) => void
  portalContainer: RefObject<HTMLElement | null>
  active?: boolean
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label
  const triggerLabel = `${label}，当前为${selectedLabel}`

  const triggerContent = (
    <>
      <span className={styles.triggerValue}>{selectedLabel}</span>
      <ChevronIcon />
    </>
  )

  return (
    <div className={styles.root} data-filter-active={active || undefined}>
      <div className={styles.desktopOnly}>
        <Select.Root
          items={options.map(({ value: optionValue, label: optionLabel }) => ({
            value: optionValue,
            label: optionLabel,
          }))}
          value={value}
          onValueChange={(nextValue) => {
            if (nextValue !== null) onChange(nextValue)
          }}
        >
          <Select.Trigger className={styles.trigger} aria-label={triggerLabel}>
            <Select.Value className={styles.triggerValue} />
            <Select.Icon className={styles.triggerIcon}>
              <ChevronIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal container={portalContainer}>
            <Select.Positioner
              className={styles.positioner}
              side="bottom"
              align="end"
              sideOffset={8}
              positionMethod="fixed"
              alignItemWithTrigger={false}
            >
              <Select.Popup className={styles.popup}>
                <Select.List className={styles.optionList}>
                  {options.map((option) => (
                    <Select.Item
                      className={styles.option}
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      <Select.ItemText>{option.label}</Select.ItemText>
                      <Select.ItemIndicator className={styles.optionIndicator}>
                        <CheckIcon />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className={styles.mobileOnly}>
        <Drawer.Root swipeDirection="down">
          <Drawer.Trigger className={styles.trigger} aria-label={triggerLabel}>
            {triggerContent}
          </Drawer.Trigger>
          <Drawer.Portal container={portalContainer}>
            <Drawer.Backdrop className={styles.drawerBackdrop} />
            <Drawer.Viewport className={styles.drawerViewport}>
              <Drawer.Popup className={styles.drawerPopup}>
                <div className={styles.drawerHandle} aria-hidden="true" />
                <Drawer.Content className={styles.drawerContent}>
                  <header className={styles.drawerHeader}>
                    <div>
                      <Drawer.Title>{label}</Drawer.Title>
                      <Drawer.Description>选择后会立即更新归档文章列表</Drawer.Description>
                    </div>
                    <Drawer.Close className={styles.drawerClose} aria-label="关闭选择面板">
                      <CloseIcon />
                    </Drawer.Close>
                  </header>
                  <div className={styles.drawerOptions} aria-label={label}>
                    {options.map((option) => (
                      <Drawer.Close
                        className={styles.drawerOption}
                        key={option.value}
                        disabled={option.disabled}
                        aria-pressed={option.value === value}
                        onClick={() => onChange(option.value)}
                      >
                        <span>{option.label}</span>
                        {option.value === value && <CheckIcon />}
                      </Drawer.Close>
                    ))}
                  </div>
                </Drawer.Content>
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="m6.5 8 3.5 3.5L13.5 8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m5 10.25 3.1 3.1L15.25 6.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m6 6 8 8m0-8-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
