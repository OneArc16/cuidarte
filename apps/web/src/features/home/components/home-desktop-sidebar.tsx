import { type AuthUser } from "@cuidarte/contracts";
import { useState } from "react";

import { BrandLockup } from "@/app/components/brand-lockup";
import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeModuleButton } from "./home-module-button";
import { HomeUserSummary } from "./home-user-summary";
import { SessionLogoutButton } from "./session-logout-button";
import { canViewModule, HOME_MODULES, isNavigationModule } from "../lib/home-modules";

type HomeDesktopSidebarProps = {
  activeModuleId: string;
  user: AuthUser;
  navigate: Navigate;
  onLogoutSuccess: () => void;
};

export function HomeDesktopSidebar({
  activeModuleId,
  navigate,
  user,
  onLogoutSuccess,
}: HomeDesktopSidebarProps) {
  const [shouldCollapseAfterAction, setShouldCollapseAfterAction] = useState(false);
  const visibleModules = HOME_MODULES.filter(
    (module) => isNavigationModule(module) && canViewModule(module, user.role),
  );

  return (
    <aside
      className={
        shouldCollapseAfterAction
          ? "home-sidebar home-sidebar--collapse-after-action"
          : "home-sidebar"
      }
      aria-label="Menu principal de CuidarTe"
      onPointerLeave={() => {
        setShouldCollapseAfterAction(false);
      }}
      onClickCapture={(event) => {
        if (event.detail === 0) {
          return;
        }

        const clickedElement = event.target;

        if (!(clickedElement instanceof HTMLElement)) {
          return;
        }

        clickedElement.closest("button")?.blur();
        setShouldCollapseAfterAction(true);
      }}
    >
      <div className="home-sidebar__top">
        <BrandLockup />
        <HomeUserSummary user={user} />
      </div>

      <nav className="home-nav" aria-label="Modulos principales">
        <ul>
          {visibleModules.map((module) => (
            <li key={module.id}>
              <HomeModuleButton
                module={module}
                isActive={module.id === activeModuleId}
                variant="desktop"
                onClick={() => {
                  if (module.path !== undefined) {
                    navigate(module.path);
                  }
                }}
              />
            </li>
          ))}
        </ul>
      </nav>

      <SessionLogoutButton className="home-logout" onLogoutSuccess={onLogoutSuccess} />
    </aside>
  );
}
