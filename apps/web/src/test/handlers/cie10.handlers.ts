import { http, HttpResponse } from "msw";

import { cie10OptionsFixture } from "../fixtures";

export const cie10Handlers = [
  http.get("http://localhost:3001/api/cie10/options", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() ?? "";
    const options =
      search.length < 3
        ? []
        : cie10OptionsFixture.filter((option) =>
            [option.code, option.title].join(" ").toLowerCase().includes(search),
          );

    return HttpResponse.json({ options });
  }),
] as const;
