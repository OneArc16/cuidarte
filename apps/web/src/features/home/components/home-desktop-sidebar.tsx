import { type AuthUser } from "@cuidarte/contracts";
import { ChevronsUpDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLockup } from "@/app/components/brand-lockup";
import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeModuleButton } from "./home-module-button";
import { HomeUserSummary } from "./home-user-summary";
import { SessionLogoutButton } from "./session-logout-button";
import { formatTenantLocation } from "../lib/home-formatters";
import { canViewModule, HOME_MODULES, isNavigationModule } from "../lib/home-modules";

type HomeDesktopSidebarProps = {
  activeModuleId: string;
  user: AuthUser;
  navigate: Navigate;
  onLogoutSuccess: () => void;
  onExpandedChange: (isExpanded: boolean) => void;
};

export function HomeDesktopSidebar({
  activeModuleId,
  navigate,
  user,
  onLogoutSuccess,
  onExpandedChange,
}: HomeDesktopSidebarProps) {
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const isExpanded = isPinnedExpanded || isPointerInside || isFocusWithin;
  const tenantLocation = formatTenantLocation(user);
  const visibleModules = HOME_MODULES.filter(
    (module) => isNavigationModule(module) && canViewModule(module, user),
  );
  const careModules = visibleModules.filter((module) =>
    [
      "inicio",
      "adultos-mayores",
      "sesiones-grupales",
      "atenciones-enfermeria",
      "nutricion",
      "registro-alimentacion",
    ].includes(module.id),
  );
  const managementModules = visibleModules.filter((module) =>
    ["gestion-empleados", "reportes", "backoffice"].includes(module.id),
  );
  const settingsModule = visibleModules.find((module) => module.id === "ajustes");

  useEffect(() => {
    onExpandedChange(isExpanded);
  }, [isExpanded, onExpandedChange]);

  useEffect(
    () => () => {
      onExpandedChange(false);
    },
    [onExpandedChange],
  );

  const renderModules = (modules: typeof visibleModules) =>
    modules.map((module) => (
      <li key={module.id}>
        <HomeModuleButton
          module={module}
          isActive={module.id === activeModuleId}
          variant="desktop"
          onClick={() => {
            navigate(module.path);
          }}
        />
      </li>
    ));

  return (
    <aside
      className={`home-sidebar${isExpanded ? " home-sidebar--expanded" : " home-sidebar--collapsed"}`}
      aria-label="Menu principal de CuidarTe"
      onPointerEnter={() => {
        setIsPointerInside(true);
      }}
      onPointerLeave={() => {
        setIsPointerInside(false);
        setIsFocusWithin(false);
      }}
      onFocusCapture={() => {
        setIsFocusWithin(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsFocusWithin(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsProfileMenuOpen(false);
        }
      }}
      onClickCapture={(event) => {
        if (event.detail === 0) {
          return;
        }

        const clickedElement = event.target;

        if (!(clickedElement instanceof HTMLElement)) {
          return;
        }

        const moduleButton = clickedElement.closest(".module-button--desktop");

        if (!(moduleButton instanceof HTMLElement)) {
          return;
        }

        moduleButton.blur();
        setIsFocusWithin(false);
      }}
    >
      <div className="home-sidebar__header">
        <BrandLockup location={tenantLocation} />
        <button
          className="home-sidebar__toggle"
          type="button"
          aria-label={
            isPinnedExpanded ? "Colapsar menú lateral al salir" : "Mantener menú lateral expandido"
          }
          title={isPinnedExpanded ? "Colapsar al salir" : "Mantener expandido"}
          onClick={() => {
            setIsPinnedExpanded((currentValue) => !currentValue);
          }}
        >
          {isPinnedExpanded ? (
            <PanelLeftClose aria-hidden="true" />
          ) : (
            <PanelLeftOpen aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="home-nav" aria-label="Modulos principales">
        {careModules.length > 0 ? (
          <section className="home-nav__section" aria-label="Cuidado">
            <p className="home-nav__heading">Cuidado</p>
            <ul>{renderModules(careModules)}</ul>
          </section>
        ) : null}
        {managementModules.length > 0 ? (
          <section className="home-nav__section" aria-label="Gestión">
            <p className="home-nav__heading">Gestión</p>
            <ul>{renderModules(managementModules)}</ul>
          </section>
        ) : null}
      </nav>

      <div className="home-sidebar__footer">
        {settingsModule === undefined ? null : (
          <HomeModuleButton
            module={settingsModule}
            isActive={settingsModule.id === activeModuleId}
            variant="desktop"
            onClick={() => {
              navigate(settingsModule.path);
            }}
          />
        )}
        <div className="home-sidebar__account">
          <section className="home-sidebar__user-region" aria-label="Usuario logueado">
            <HomeUserSummary
              user={user}
              asButton
              showLocation={false}
              ariaExpanded={isProfileMenuOpen}
              ariaHaspopup="menu"
              ariaLabel="Abrir menú de perfil"
              endAdornment={<ChevronsUpDown className="home-user__menu-icon" aria-hidden="true" />}
              onClick={() => {
                setIsProfileMenuOpen((currentValue) => !currentValue);
              }}
            />
          </section>
          {isProfileMenuOpen ? (
            <div className="home-profile-menu" role="group" aria-label="Menú de perfil">
              <SessionLogoutButton
                className="home-profile-menu__logout"
                onLogoutSuccess={onLogoutSuccess}
              />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
