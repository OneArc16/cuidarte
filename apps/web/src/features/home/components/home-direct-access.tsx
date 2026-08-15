import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeAccessShortcutCard } from "./home-access-shortcut-card";
import {
  canViewModule,
  HOME_MODULES,
  isShortcutModule,
  type ShortcutHomeModule,
} from "../lib/home-modules";

type HomeDirectAccessProps = {
  user: AuthUser;
  navigate: Navigate;
};

const HOME_SHORTCUT_MODULES = HOME_MODULES.filter(isShortcutModule) as readonly ShortcutHomeModule[];

export function HomeDirectAccess({ navigate, user }: HomeDirectAccessProps) {
  const visibleShortcutModules = HOME_SHORTCUT_MODULES.filter((module) =>
    canViewModule(module, user.role),
  );

  return (
    <>
      <h1 id="home-title" className="visually-hidden">
        Panel de acceso
      </h1>

      <section className="home-dashboard-section" aria-labelledby="home-access-title">
        <div className="home-dashboard-section__header">
          <div>
            <span className="eyebrow">Accesos</span>
            <h2 id="home-access-title">Accesos directos</h2>
          </div>
        </div>

        <div className="home-shortcuts-grid">
          {visibleShortcutModules.map((module) => (
            <HomeAccessShortcutCard
              key={module.id}
              module={module}
              onClick={() => {
                navigate(module.path);
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
