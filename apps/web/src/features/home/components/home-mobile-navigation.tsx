import { type AuthUser } from "@cuidarte/contracts";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeModuleButton } from "./home-module-button";
import { HomeUserSummary } from "./home-user-summary";
import { SessionLogoutButton } from "./session-logout-button";
import { canViewModule, HOME_MODULES, isMobilePrimaryModule } from "../lib/home-modules";

type HomeMobileNavigationProps = {
  activeModuleId: string;
  user: AuthUser;
  navigate: Navigate;
  onLogoutSuccess: () => void;
};

export function HomeMobileNavigation({
  activeModuleId,
  navigate,
  user,
  onLogoutSuccess,
}: HomeMobileNavigationProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const visibleModules = HOME_MODULES.filter((module) => canViewModule(module, user.role));
  const primaryModules = visibleModules.filter((module) => isMobilePrimaryModule(module));
  const secondaryModules = visibleModules.filter((module) => !isMobilePrimaryModule(module));

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  const closeMore = () => {
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="home-mobile-nav" aria-label="Navegacion movil">
        {primaryModules.map((module) => (
          <HomeModuleButton
            key={module.id}
            module={module}
            isActive={module.id === activeModuleId}
            variant="mobile"
            onClick={() => {
              if (module.path !== undefined) {
                navigate(module.path);
              }
            }}
          />
        ))}
        <button
          className={
            isMoreOpen
              ? "module-button module-button--mobile module-button--more module-button--active"
              : "module-button module-button--mobile module-button--more"
          }
          type="button"
          aria-label="Más"
          aria-controls="home-mobile-more-sheet"
          aria-expanded={isMoreOpen}
          onClick={() => {
            setIsMoreOpen((currentValue) => !currentValue);
          }}
        >
          <span className="module-button__icon" aria-hidden="true">
            <Menu />
          </span>
          <span className="module-button__label">Más</span>
        </button>
      </nav>

      {isMoreOpen ? (
        <div className="home-mobile-sheet-layer">
          <div className="home-mobile-sheet-backdrop" aria-hidden="true" onClick={closeMore} />
          <section
            className="home-mobile-sheet"
            id="home-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mobile-more-title"
          >
            <div className="home-mobile-sheet__header">
              <div>
                <p className="eyebrow">Menu</p>
                <h2 id="home-mobile-more-title">Más módulos</h2>
              </div>
              <button
                className="home-mobile-sheet__close"
                type="button"
                aria-label="Cerrar menu de mas modulos"
                onClick={closeMore}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <HomeUserSummary className="home-mobile-sheet__user" user={user} />

            <nav className="home-mobile-sheet__nav" aria-label="Mas modulos">
              {secondaryModules.map((module) => (
                <HomeModuleButton
                  key={module.id}
                  module={module}
                  isActive={module.id === activeModuleId}
                  variant="sheet"
                  onClick={() => {
                    if (module.path !== undefined) {
                      navigate(module.path);
                    }

                    closeMore();
                  }}
                />
              ))}
            </nav>

            <SessionLogoutButton
              className="home-mobile-sheet__logout"
              onLogoutSuccess={onLogoutSuccess}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
