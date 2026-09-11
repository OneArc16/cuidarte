import { useEffect, useState } from "react";

export function useSessionStorageState(key: string, initialValue = "") {
  const [value, setValue] = useState(() => {
    const storedValue = window.sessionStorage.getItem(key);
    return storedValue ?? initialValue;
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
