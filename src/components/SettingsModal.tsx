import type { CSSProperties, ReactNode } from 'react'
import { AI_SPEEDS, ANIMATION_SPEEDS, defaultSettings, type GameSettings } from '../data/settings'
import { useToast } from '../hooks/useToast'
import { LANGUAGES, useT, type LanguageCode } from '../i18n'
import { IconChevronDown, IconCog } from './icons'
import { ModalFrame } from './ModalFrame'
import { AccountSection, NotificationsSection, PrivacySection } from './settings/AccountSettings'
import { SectionDivider } from './theme/Ornaments'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  settings: GameSettings
  onChange: (settings: GameSettings) => void
}

/** Settings dialog. Saved between visits; changes apply at once, also in a match. */
export function SettingsModal({ open, onClose, settings, onChange }: SettingsModalProps) {
  const t = useT()
  const s = t.settings
  const notify = useToast()
  const update = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      id="settings"
      title={t.nav.settings}
      icon={<IconCog />}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={() => onChange(defaultSettings())}>
            {s.reset}
          </button>
          <button type="button" className="btn btn-primary px-6" onClick={onClose}>
            {t.common.done}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <SettingsGroup title={s.game}>
          <Choice
            id="animation-speed"
            label={s.animationSpeed}
            description={s.animationHint}
            options={ANIMATION_SPEEDS}
            optionLabel={(option) => s.speeds[option]}
            value={settings.animationSpeed}
            onChange={(value) => update('animationSpeed', value)}
          />
          <Choice
            id="ai-speed"
            label={s.aiSpeed}
            description={s.aiSpeedHint}
            options={AI_SPEEDS}
            optionLabel={(option) => s.speeds[option]}
            value={settings.aiSpeed}
            onChange={(value) => update('aiSpeed', value)}
          />
          <Toggle
            id="move-timer"
            label={s.moveTimer}
            description={s.moveTimerHint}
            checked={settings.showMoveTimer}
            onChange={(checked) => update('showMoveTimer', checked)}
          />
          <Toggle
            id="show-log"
            label={s.showLog}
            checked={settings.showLog}
            onChange={(checked) => update('showLog', checked)}
          />
        </SettingsGroup>

        <SettingsGroup title={s.audio}>
          <Toggle id="sound" label={s.sound} checked={settings.soundOn} onChange={(checked) => update('soundOn', checked)} />
          <VolumeSlider
            id="master-volume"
            label={s.masterVolume}
            value={settings.masterVolume}
            disabled={!settings.soundOn}
            onChange={(value) => update('masterVolume', value)}
          />
          <VolumeSlider
            id="music-volume"
            label={s.musicVolume}
            value={settings.musicVolume}
            disabled={!settings.soundOn}
            onChange={(value) => update('musicVolume', value)}
          />
        </SettingsGroup>

        <SettingsGroup title={s.general}>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="language" className="font-medium text-parchment-100">
              {s.language}
            </label>
            <div className="relative">
              <select
                id="language"
                value={settings.language}
                onChange={(event) => update('language', event.target.value as LanguageCode)}
                className="appearance-none rounded-lg border border-bronze-500/35 bg-soot-950/70 py-2 pr-9 pl-3 text-parchment-50 transition outline-none hover:border-bronze-300/60 focus-visible:border-bronze-300/80"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.code} value={language.code} lang={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
              <IconChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-bronze-300" />
            </div>
          </div>

        </SettingsGroup>

        <SettingsGroup title={s.account}>
          <AccountSection onDone={onClose} notify={notify} />
        </SettingsGroup>

        <SettingsGroup title={s.notifications}>
          <NotificationsSection />
        </SettingsGroup>

        <SettingsGroup title={s.privacy}>
          <PrivacySection onClose={onClose} />
        </SettingsGroup>
      </div>
    </ModalFrame>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="group/section">
      <SectionDivider />
      <h3 className="eyebrow mb-3 flex items-center gap-3">
        {title}
        <span className="h-px flex-1 bg-linear-to-r from-bronze-500/40 to-transparent" />
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

interface ChoiceProps<T extends string> {
  id: string
  label: string
  description?: string
  options: readonly T[]
  optionLabel: (option: T) => string
  value: T
  onChange: (value: T) => void
}

/** A row of mutually exclusive options. */
function Choice<T extends string>({ id, label, description, options, optionLabel, value, onChange }: ChoiceProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div>
        <span id={`${id}-label`} className="block font-medium text-parchment-100">
          {label}
        </span>
        {description && <span className="block text-sm text-parchment-400">{description}</span>}
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex overflow-hidden rounded-lg border border-bronze-500/35">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={`min-h-10 px-3 text-sm font-semibold tracking-wide transition ${
              value === option ? 'bg-bronze-500/35 text-parchment-50' : 'text-parchment-400 hover:text-parchment-100'
            }`}
          >
            {optionLabel(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

interface VolumeSliderProps {
  id: string
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}

function VolumeSlider({ id, label, value, disabled = false, onChange }: VolumeSliderProps) {
  return (
    <div className={disabled ? 'opacity-45' : undefined}>
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor={id} className="font-medium text-parchment-100">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-lg font-semibold text-bronze-300 tabular-nums">
          {value}%
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="bz-range"
        style={{ '--fill': `${value}%` } as CSSProperties}
      />
    </div>
  )
}

interface ToggleProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** On/off switch with ARIA switch semantics. */
function Toggle({ id, label, description, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span id={`${id}-label`} className="block font-medium text-parchment-100">
          {label}
        </span>
        {description && <span className="block text-sm text-parchment-400">{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-13 shrink-0 rounded-full border transition-colors duration-200 ${
          checked
            ? 'border-bronze-300/70 bg-linear-to-r from-bronze-600 to-ember-500 shadow-[0_0_14px_-2px_rgb(255_122_26/0.6)]'
            : 'border-bronze-500/30 bg-soot-700'
        }`}
      >
        <span
          className={`absolute top-1/2 left-0.5 size-5.5 -translate-y-1/2 rounded-full bg-radial-[at_35%_30%] from-brass-200 to-bronze-500 shadow-[0_2px_6px_rgb(0_0_0/0.6)] transition-transform duration-200 ease-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
