import { useEffect, useState } from "react";

export function useSessionStorageState<Value extends string = string>(
  key: string,
  initialValue: Value = "" as Value,
) {
  const [value, setValue] = useState(() => {
    const storedValue = window.sessionStorage.getItem(key);
    return (storedValue ?? initialValue) as Value;
  });

  useEffect(() => {
    if (value === "") {
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
