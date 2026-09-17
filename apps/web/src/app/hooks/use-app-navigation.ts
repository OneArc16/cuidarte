import { useCallback, useEffect, useState } from "react";

export type NavigateOptions = {
  replace?: boolean;
  state?: Record<string, unknown>;
};

export type Navigate = (nextPath: string, options?: NavigateOptions) => void;
export type GoBack = (fallbackPath: string) => void;

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
      window.history[options.replace === true ? "replaceState" : "pushState"](
        options.state ?? {},
        "",
        nextPath,
      );
    }

    setPath(nextPath);
  }, []);

  const goBack = useCallback((fallbackPath: string) => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    navigate(fallbackPath);
  }, [navigate]);

  return { goBack, path, navigate };
}
