import {
  type Cie10Option,
  cie10OptionSchema,
  type Cie10SearchQuery,
} from "@cuidarte/contracts";
import { Inject, Injectable } from "@nestjs/common";

import { CIE10_REPOSITORY, type Cie10Repository } from "../domain/cie10.repository";
import { normalizeCie10Code } from "./cie10-code";

const MIN_SEARCH_LENGTH = 3;
const DEFAULT_LIMIT = 20;

@Injectable()
export class Cie10Service {
  constructor(
    @Inject(CIE10_REPOSITORY)
    private readonly cie10Repository: Cie10Repository,
  ) {}

  async searchOptions(query: Cie10SearchQuery): Promise<Cie10Option[]> {
    const search = query.search?.trim() ?? "";

    if (search.length < MIN_SEARCH_LENGTH) {
      return [];
    }

    const options = await this.cie10Repository.searchOptions({
      search,
      limit: DEFAULT_LIMIT,
    });

    return options.map((option) =>
      cie10OptionSchema.parse({
        code: normalizeCie10Code(option.code),
        title: option.title,
      }),
    );
  }
}
