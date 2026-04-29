import { type Cie10Option } from "@cuidarte/contracts";
import { Search } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { type UseFormReturn } from "react-hook-form";

import { useCie10OptionsQuery } from "../model/cie10-queries";
import {
  formatCie10OptionLabel,
  resolveCie10ApiError,
} from "../lib/cie10-formatters";
import { AtencionFieldGroup } from "@/features/atenciones-individuales/components/atencion-field-group";
import { type AtencionIndividualFormValues } from "@/features/atenciones-individuales/schemas/atencion-individual-form.schema";
import { normalizeCie10Code } from "@/shared/lib/cie10-code";

const MIN_SEARCH_LENGTH = 3;

type Cie10AutocompleteFieldProps = {
  descripcionName: `diagnosticos.${number}.descripcion`;
  form: UseFormReturn<AtencionIndividualFormValues>;
  index: number;
  readOnly?: boolean;
};

export function Cie10AutocompleteField({
  descripcionName,
  form,
  index,
  readOnly = false,
}: Cie10AutocompleteFieldProps) {
  const codigoName = `diagnosticos.${index}.codigoCie10` as const;
  const codigoValue = form.watch(codigoName);
  const descripcionValue = form.watch(descripcionName);
  const normalizedCodeValue = normalizeCie10Code(codigoValue);
  const selectedLabel =
    normalizedCodeValue.trim() === "" || descripcionValue.trim() === ""
      ? ""
      : formatCie10OptionLabel(normalizedCodeValue, descripcionValue);
  const [search, setSearch] = useState(selectedLabel);
  const deferredSearch = useDeferredValue(search.trim());
  const hasSelection = selectedLabel !== "";
  const isSearching =
    !readOnly && deferredSearch.length >= MIN_SEARCH_LENGTH && deferredSearch !== selectedLabel;
  const optionsQuery = useCie10OptionsQuery(deferredSearch, isSearching);
  const codeError = form.formState.errors.diagnosticos?.[index]?.codigoCie10?.message;
  const labelError = typeof codeError === "string" ? codeError : undefined;
  const searchStatus = resolveSearchStatus({
    hasSelection,
    hasValidationError: labelError !== undefined,
    isSearching,
    searchText: search,
  });

  useEffect(() => {
    if (codigoValue.trim() === "") {
      return;
    }

    if (normalizedCodeValue !== codigoValue) {
      form.setValue(codigoName, normalizedCodeValue, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [codigoName, codigoValue, form, normalizedCodeValue]);

  useEffect(() => {
    if (selectedLabel === "") {
      return;
    }

    if (search === "" || search === normalizedCodeValue || search === descripcionValue) {
      setSearch(selectedLabel);
    }
  }, [descripcionValue, normalizedCodeValue, search, selectedLabel]);

  function selectOption(option: Cie10Option) {
    const normalizedCode = normalizeCie10Code(option.code);

    form.setValue(codigoName, normalizedCode, { shouldDirty: true, shouldValidate: true });
    form.setValue(descripcionName, option.title, { shouldDirty: true, shouldValidate: true });
    setSearch(formatCie10OptionLabel(normalizedCode, option.title));
  }

  function clearSelection(nextSearch: string) {
    form.setValue(codigoName, "", { shouldDirty: true, shouldValidate: true });
    form.setValue(descripcionName, "", { shouldDirty: true, shouldValidate: true });
    setSearch(nextSearch);
  }

  return (
    <div className="cie10-field">
      <AtencionFieldGroup label="CIE-10">
        <div className="cie10-search-anchor">
          <div className="cie10-search-input">
            <Search aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar CIE-10"
              aria-invalid={labelError === undefined ? undefined : true}
              placeholder="Buscar por codigo o nombre"
              readOnly={readOnly}
              value={search}
              onChange={(event) => {
                clearSelection(event.target.value);
              }}
            />
          </div>

          {isSearching ? (
            <div className="cie10-search-results" role="listbox" aria-label="Resultados CIE-10">
              {optionsQuery.isError ? (
                <p className="field-error">{resolveCie10ApiError(optionsQuery.error)}</p>
              ) : optionsQuery.isFetching ? (
                <p className="cie10-search-hint">Buscando diagnosticos...</p>
              ) : (optionsQuery.data?.options.length ?? 0) === 0 ? (
                <p className="cie10-search-hint">Sin resultados para esa busqueda.</p>
              ) : (
                optionsQuery.data?.options.map((option) => {
                  const normalizedCode = normalizeCie10Code(option.code);

                  return (
                    <button
                      key={option.code}
                      className="cie10-search-option"
                      type="button"
                      onClick={() => selectOption(option)}
                    >
                      <strong>{normalizedCode}</strong>
                      <span>{option.title}</span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </AtencionFieldGroup>

      <p
        className={
          searchStatus.tone === "error" ? "cie10-search-status cie10-search-status--error" : "cie10-search-status"
        }
        role={searchStatus.tone === "error" ? "alert" : undefined}
      >
        {searchStatus.message}
      </p>
    </div>
  );
}

function resolveSearchStatus({
  hasSelection,
  hasValidationError,
  isSearching,
  searchText,
}: {
  hasSelection: boolean;
  hasValidationError: boolean;
  isSearching: boolean;
  searchText: string;
}): {
  message: string;
  tone: "error" | "hint";
} {
  if (hasValidationError) {
    return { message: "Digite un codigo CIE-10 valido.", tone: "error" };
  }

  if (searchText.trim().length === 0) {
    return { message: "Escribe al menos 3 caracteres para buscar.", tone: "hint" };
  }

  if (isSearching) {
    return { message: "Selecciona un diagnostico del listado para completar el codigo.", tone: "hint" };
  }

  if (hasSelection) {
    return { message: "", tone: "hint" };
  }

  return { message: "Escribe al menos 3 caracteres para buscar.", tone: "hint" };
}
