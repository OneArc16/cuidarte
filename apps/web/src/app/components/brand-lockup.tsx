import { MapPin } from "lucide-react";

type BrandLockupProps = {
  location?: string | null;
};

export function BrandLockup({ location = null }: BrandLockupProps) {
  return (
    <div className="brand-lockup">
      <span className="brand-lockup__mark" aria-hidden="true">
        C
      </span>
      <span className="brand-lockup__identity">
        <span className="brand-lockup__name">CuidarTe</span>
        {location === null ? null : (
          <span className="brand-lockup__location">
            <MapPin aria-hidden="true" />
            {location}
          </span>
        )}
      </span>
    </div>
  );
}
