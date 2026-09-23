import type { RefObject } from 'preact'
import { ArrowDown, ArrowUp, CaseSensitive, Close, Filter, Regex, Search } from './Icons'
import { useI18n } from './i18n'

export interface SearchBarProps {
  query: string
  onQuery: (query: string) => void
  regex: boolean
  caseSensitive: boolean
  onlyMatches: boolean
  onToggle: (key: 'regex' | 'caseSensitive' | 'onlyMatches') => void
  count: number
  index: number
  truncated: boolean
  busy: boolean
  invalid: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement>
}

export function SearchBar(props: SearchBarProps) {
  const { t } = useI18n()
  const { count, index, query } = props
  const empty = query.length > 0 && count === 0

  return (
    <div class="jr-search">
      <label class="jr-search-field">
        <Search size={14} />
        <input
          ref={props.inputRef}
          class="jr-search-input"
          type="text"
          spellcheck={false}
          autocomplete="off"
          placeholder={t('searchPlaceholder')}
          value={query}
          onInput={(event) => props.onQuery((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              if (event.shiftKey) props.onPrev()
              else props.onNext()
            }
          }}
        />
      </label>

      <span
        class={
          empty || props.invalid ? 'jr-search-count is-empty' : 'jr-search-count'
        }
      >
        {props.invalid
          ? t('regexInvalid')
          : props.busy
            ? t('searching')
            : query
              ? `${count === 0 ? 0 : index + 1} / ${count}${props.truncated ? '+' : ''}`
              : ''}
      </span>

      <div class="jr-search-nav">
        <button
          class="jr-btn"
          type="button"
          title={`${t('previous')}（⇧↵）`}
          aria-label={t('previous')}
          disabled={count === 0}
          onClick={props.onPrev}
        >
          <ArrowUp />
        </button>
        <button
          class="jr-btn"
          type="button"
          title={`${t('next')}（↵）`}
          aria-label={t('next')}
          disabled={count === 0}
          onClick={props.onNext}
        >
          <ArrowDown />
        </button>
      </div>

      <span class="jr-sep" />

      <button
        class={props.regex ? 'jr-toggle is-active' : 'jr-toggle'}
        type="button"
        title={t('regex')}
        aria-pressed={props.regex}
        onClick={() => props.onToggle('regex')}
      >
        <Regex size={13} />
        .*
      </button>
      <button
        class={props.caseSensitive ? 'jr-toggle is-active' : 'jr-toggle'}
        type="button"
        title={t('caseSensitive')}
        aria-pressed={props.caseSensitive}
        onClick={() => props.onToggle('caseSensitive')}
      >
        <CaseSensitive size={13} />
      </button>
      <button
        class={props.onlyMatches ? 'jr-toggle is-active' : 'jr-toggle'}
        type="button"
        title={t('onlyMatches')}
        aria-pressed={props.onlyMatches}
        onClick={() => props.onToggle('onlyMatches')}
      >
        <Filter size={13} />
        {t('onlyMatches')}
      </button>

      <button class="jr-btn" type="button" title={`${t('closeSearch')}（Esc）`} aria-label={t('closeSearch')} onClick={props.onClose}>
        <Close />
      </button>
    </div>
  )
}
