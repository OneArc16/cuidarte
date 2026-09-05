import { Search } from "lucide-react";
import {
  type FocusEvent,
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;
const DEFAULT_MAX_RESULTS = 20;

type SearchableComboboxProps<TOption extends { id: string }> = {
  ariaInvalid?: boolean;
  ariaLabel: string;
  disabled?: boolean;
  emptyMessage?: string;
  getOptionLabel: (option: TOption) => string;
  isLoading?: boolean;
  loadingMessage?: string;
  maxResults?: number;
  minimumSearchLength?: number;
  onBlur?: () => void;
  onValueChange: (value: string) => void;
  options: readonly TOption[];
  placeholder?: string | undefined;
  value: string;
};

export function SearchableCombobox<TOption extends { id: string }>({
  ariaInvalid = false,
  ariaLabel,
  disabled = false,
  emptyMessage = "No se encontraron resultados.",
  getOptionLabel,
  isLoading = false,
  loadingMessage = "Cargando opciones...",
  maxResults = DEFAULT_MAX_RESULTS,
  minimumSearchLength = DEFAULT_MINIMUM_SEARCH_LENGTH,
  onBlur,
  onValueChange,
  options,
  placeholder = `Escribe al menos ${minimumSearchLength} caracteres`,
  value,
}: SearchableComboboxProps<TOption>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const previousValueRef = useRef(value);
  const previousSelectedLabelRef = useRef("");
  const preserveQueryOnClearRef = useRef(false);
  const selectedOption = options.find((option) => option.id === value);
  const selectedLabel = selectedOption === undefined ? "" : getOptionLabel(selectedOption);
  const [query, setQuery] = useState(selectedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const deferredQuery = useDeferredValue(query.trim());
  const canSearch = value === "" && deferredQuery.length >= minimumSearchLength;
  const filteredOptions = canSearch
    ? options
        .filter((option) =>
          normalizeSearchText(getOptionLabel(option)).includes(normalizeSearchText(deferredQuery)),
        )
        .slice(0, maxResults)
    : [];
  const activeOption = filteredOptions[activeOptionIndex];
  const shouldShowResults = isOpen && canSearch;
  const hasResults = shouldShowResults && !isLoading && filteredOptions.length > 0;
  const activeOptionDomId =
    activeOption === undefined ? undefined : buildOptionDomId(listboxId, activeOption.id);

  useEffect(() => {
    const valueChanged = previousValueRef.current !== value;
    const selectedLabelChanged = previousSelectedLabelRef.current !== selectedLabel;

    if (!valueChanged && !selectedLabelChanged) {
      return;
    }

    previousValueRef.current = value;
    previousSelectedLabelRef.current = selectedLabel;

    if (preserveQueryOnClearRef.current && value === "") {
      preserveQueryOnClearRef.current = false;
      return;
    }

    setQuery(selectedLabel);
    setActiveOptionIndex(-1);
  }, [selectedLabel, value]);

  function handleInputChange(nextQuery: string) {
    if (value !== "") {
      preserveQueryOnClearRef.current = true;
      onValueChange("");
    }

    setQuery(nextQuery);
    setIsOpen(true);
    setActiveOptionIndex(-1);
  }

  function selectOption(option: TOption) {
    onValueChange(option.id);
    setQuery(getOptionLabel(option));
    setIsOpen(false);
    setActiveOptionIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveOptionIndex(-1);
      return;
    }

    if (!canSearch || filteredOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveOptionIndex((currentIndex) =>
        currentIndex >= filteredOptions.length - 1 ? 0 : currentIndex + 1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOptionIndex((currentIndex) =>
        currentIndex <= 0 ? filteredOptions.length - 1 : currentIndex - 1,
      );
      return;
    }

    if (event.key === "Enter" && activeOption !== undefined) {
      event.preventDefault();
      selectOption(activeOption);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (rootRef.current?.contains(event.relatedTarget)) {
      return;
    }

    setIsOpen(false);
    setActiveOptionIndex(-1);
    onBlur?.();
  }

  return (
    <div ref={rootRef} className="searchable-combobox" onBlur={handleBlur}>
      <Search className="searchable-combobox__icon" aria-hidden="true" />
      <input
        className="searchable-combobox__input"
        type="search"
        role="combobox"
        aria-activedescendant={activeOptionDomId}
        aria-autocomplete="list"
        aria-controls={hasResults ? listboxId : undefined}
        aria-expanded={hasResults}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled || isLoading}
        placeholder={placeholder}
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {shouldShowResults ? (
        isLoading ? (
          <div className="searchable-combobox__results" role="status">
            <p className="searchable-combobox__message">{loadingMessage}</p>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="searchable-combobox__results" role="status">
            <p className="searchable-combobox__message">{emptyMessage}</p>
          </div>
        ) : (
          <div className="searchable-combobox__results" id={listboxId} role="listbox">
            {filteredOptions.map((option, index) => (
              <div
                key={option.id}
                id={buildOptionDomId(listboxId, option.id)}
                className="searchable-combobox__option"
                data-active={index === activeOptionIndex ? "true" : undefined}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {getOptionLabel(option)}
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .trim();
}

function buildOptionDomId(listboxId: string, optionId: string): string {
  return `${listboxId}-option-${encodeURIComponent(optionId)}`;
}
