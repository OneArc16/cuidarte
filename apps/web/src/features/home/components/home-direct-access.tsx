import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeAccessShortcutCard } from "./home-access-shortcut-card";
import { canViewModule, HOME_MODULES, type HomeModule } from "../lib/home-modules";

type HomeDirectAccessProps = {
  user: AuthUser;
  navigate: Navigate;
};

type HomeAccessModule = HomeModule & {
  summaryLabel: string;
  directAccessDescription: string;
};

const HOME_ACCESS_MODULES = HOME_MODULES.filter(
  (module) => module.id !== "inicio",
) as readonly HomeAccessModule[];

export function HomeDirectAccess({ navigate, user }: HomeDirectAccessProps) {
  const visibleShortcutModules = HOME_ACCESS_MODULES.filter((module) =>
    canViewModule(module, user.role),
  );

  return (
    <>
      <h1 id="home-title" className="visually-hidden">
        Panel de acceso
      </h1>

      <section className="home-direct-access" aria-labelledby="home-access-title">
        <div className="home-direct-access__hero">
          <span className="eyebrow">Accesos</span>
          <h2 id="home-access-title">Accesos directos</h2>
        </div>

        <div className="home-direct-access__grid">
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
