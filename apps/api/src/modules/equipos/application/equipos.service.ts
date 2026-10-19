import {
  type AuthUser,
  type CreateEquipoRequest,
  type EquipoOption,
  type UpdateEquipoRequest,
  equipoOptionSchema,
} from "@cuidarte/contracts";
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { canManageEquipos, canViewEquipos } from "../domain/equipo.policy";
import { EQUIPOS_REPOSITORY, type EquiposRepository } from "../domain/equipos.repository";

@Injectable()
export class EquiposService {
  constructor(
    @Inject(EQUIPOS_REPOSITORY) private readonly equiposRepository: EquiposRepository,
  ) {}

  async list(actor: AuthUser): Promise<EquipoOption[]> {
    if (!canViewEquipos(actor)) throw new ForbiddenException("No tienes permisos para consultar equipos.");
    return (await this.equiposRepository.findMany()).map((team) => equipoOptionSchema.parse(team));
  }

  async create(command: CreateEquipoRequest, actor: AuthUser): Promise<EquipoOption> {
    this.ensureCanManage(actor);
    const name = command.name.trim();
    const normalizedName = normalizeEquipoName(name);
    const existing = await this.equiposRepository.findByNormalizedName(normalizedName);
    if (existing !== null) throw new ConflictException("Ya existe un equipo con ese nombre.");

    return equipoOptionSchema.parse(await this.equiposRepository.create({ name, normalizedName }));
  }

  async update(id: string, command: UpdateEquipoRequest, actor: AuthUser): Promise<EquipoOption> {
    this.ensureCanManage(actor);
    const current = await this.equiposRepository.findById(id);
    if (current === null) throw new NotFoundException("Equipo no encontrado.");

    const name = command.name?.trim();
    const normalizedName = name === undefined ? undefined : normalizeEquipoName(name);

    if (normalizedName !== undefined) {
      const duplicate = await this.equiposRepository.findByNormalizedName(normalizedName);
      if (duplicate !== null && duplicate.id !== id) {
        throw new ConflictException("Ya existe un equipo con ese nombre.");
      }
    }

    return equipoOptionSchema.parse(
      await this.equiposRepository.update({
        id,
        ...(name === undefined || normalizedName === undefined ? {} : { name, normalizedName }),
        ...(command.isVisible === undefined ? {} : { isVisible: command.isVisible }),
      }),
    );
  }

  private ensureCanManage(actor: AuthUser) {
    if (!canManageEquipos(actor)) throw new ForbiddenException("No tienes permisos para administrar equipos.");
  }
}

function normalizeEquipoName(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLocaleLowerCase("es-CO");
}
