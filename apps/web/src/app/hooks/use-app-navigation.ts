import { useCallback, useEffect, useState } from "react";

export type NavigateOptions = {
  replace?: boolean;
};

export type Navigate = (nextPath: string, options?: NavigateOptions) => void;

export function useAppNavigation() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncPath = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", syncPath);

    return () => {
      window.removeEventListener("popstate", syncPath);
    };
  }, []);

  const navigate = useCallback((nextPath: string, options: NavigateOptions = {}) => {
    if (window.location.pathname !== nextPath) {
      window.history[options.replace === true ? "replaceState" : "pushState"]({}, "", nextPath);
    }

    setPath(nextPath);
  }, []);

  return { path, navigate };
}
