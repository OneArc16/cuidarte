import {
  type AdultoMayorDetail,
  type AdultoMayorListItem,
  type AdultoMayorListQuery,
  type AdultoMayorTenantOption,
  type AuthUser,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorDetailSchema,
  adultoMayorListItemSchema,
  adultoMayorTenantOptionSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { calculateAgeFromBirthDate } from "./age";
import {
  canManageAdultosMayores,
  resolveAdultoMayorTenantForCreate,
  resolveAdultosMayoresScope,
} from "../domain/adulto-mayor.policy";
import {
  ADULTOS_MAYORES_REPOSITORY,
  type AdultosMayoresRepository,
} from "../domain/adultos-mayores.repository";
import { type AdultoMayorRecord } from "../domain/adulto-mayor.types";
import { UbicacionesService } from "../../ubicaciones/application/ubicaciones.service";
import { EpsService } from "../../eps/application/eps.service";

@Injectable()
export class AdultosMayoresService {
  constructor(
    @Inject(ADULTOS_MAYORES_REPOSITORY)
    private readonly adultosMayoresRepository: AdultosMayoresRepository,
    private readonly ubicacionesService: UbicacionesService,
    private readonly epsService: EpsService,
  ) {}

  async listAdultosMayores(
    query: AdultoMayorListQuery,
    actor: AuthUser,
  ): Promise<AdultoMayorListItem[]> {
    const scope = resolveAdultosMayoresScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para consultar adultos mayores.");
    }

    const records = await this.adultosMayoresRepository.findMany({
      search: query.search,
      scope,
    });

    return records.map((record) => this.toListItem(record));
  }

  async listTenantOptions(actor: AuthUser): Promise<AdultoMayorTenantOption[]> {
    if (actor.role !== "super_admin") {
      return [];
    }

    const tenants = await this.adultosMayoresRepository.findTenantOptions();

    return tenants.map((tenant) => adultoMayorTenantOptionSchema.parse(tenant));
  }

  async getAdultoMayor(adultoMayorId: string, actor: AuthUser): Promise<AdultoMayorDetail> {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({
      id: adultoMayorId,
      scope,
    });

    if (record === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    return this.toDetail(record);
  }

  async createAdultoMayor(
    command: CreateAdultoMayorRequest,
    actor: AuthUser,
  ): Promise<AdultoMayorDetail> {
    this.ensureCanManage(actor);
    const tenantId = resolveAdultoMayorTenantForCreate(actor, command.tenantId);

    if (tenantId === null) {
      throw new BadRequestException("Selecciona el centro al que pertenece el adulto mayor.");
    }

    if (
      actor.role !== "super_admin" &&
      command.tenantId !== null &&
      command.tenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes crear adultos mayores en otro centro.");
    }

    const [location, selectedEps] = await Promise.all([
      this.ubicacionesService.resolveDepartmentMunicipalityPair(
        command.departmentId,
        command.municipalityId,
      ),
      this.epsService.resolveForWrite(command.epsId),
    ]);

    await this.ensureDocumentIsUnique({
      tenantId,
      documentType: command.documentType,
      documentNumber: command.documentNumber,
    });

    try {
      const record = await this.adultosMayoresRepository.create(
        {
          ...command,
          departmentId: location.department.id,
          municipalityId: location.municipality.id,
          department: location.department.name,
          municipality: location.municipality.name,
          epsId: selectedEps?.id ?? null,
          tenantId,
        },
        {
          actorUserId: actor.id,
          action: "adultos-mayores.created",
          targetTenantId: tenantId,
          summary: `Adulto mayor creado: ${command.firstName} ${command.firstSurname}`,
          metadata: {
            documentType: command.documentType,
            documentNumber: command.documentNumber,
          },
        },
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async updateAdultoMayor(
    adultoMayorId: string,
    command: UpdateAdultoMayorRequest,
    actor: AuthUser,
  ): Promise<AdultoMayorDetail> {
    this.ensureCanManage(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const currentRecord = await this.adultosMayoresRepository.findById({
      id: adultoMayorId,
      scope,
    });

    if (currentRecord === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const [location, selectedEps] = await Promise.all([
      this.ubicacionesService.resolveDepartmentMunicipalityPair(
        command.departmentId,
        command.municipalityId,
      ),
      this.epsService.resolveForWrite(command.epsId, currentRecord.epsId),
    ]);

    await this.ensureDocumentIsUnique({
      tenantId: currentRecord.tenantId,
      documentType: command.documentType,
      documentNumber: command.documentNumber,
      excludeId: adultoMayorId,
    });

    // Nunca propagar un tenantId inesperado hacia persistencia, incluso si este caso de uso
    // se invoca por fuera del controller que aplica el schema de actualizacion.
    const { tenantId: _ignoredTenantId, ...safeCommand } = command as UpdateAdultoMayorRequest & {
      tenantId?: unknown;
    };

    try {
      const record = await this.adultosMayoresRepository.update(
        {
          ...safeCommand,
          departmentId: location.department.id,
          municipalityId: location.municipality.id,
          department: location.department.name,
          municipality: location.municipality.name,
          epsId: selectedEps?.id ?? null,
          id: adultoMayorId,
        },
        {
          actorUserId: actor.id,
          action: "adultos-mayores.updated",
          targetTenantId: currentRecord.tenantId,
          summary: `Adulto mayor actualizado: ${command.firstName} ${command.firstSurname}`,
          metadata: {
            before: {
              documentType: currentRecord.documentType,
              documentNumber: currentRecord.documentNumber,
              names: currentRecord.names,
              surnames: currentRecord.surnames,
            },
            after: {
              documentType: command.documentType,
              documentNumber: command.documentNumber,
              names: [command.firstName, command.middleName].filter(Boolean).join(" "),
              surnames: [command.firstSurname, command.secondSurname].filter(Boolean).join(" "),
            },
          },
        },
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveAdultosMayoresScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar adultos mayores.");
    }

    return scope;
  }

  private ensureCanManage(actor: AuthUser) {
    if (!canManageAdultosMayores(actor)) {
      throw new ForbiddenException("No tienes permisos para crear o actualizar adultos mayores.");
    }
  }

  private async ensureDocumentIsUnique(command: {
    tenantId: string;
    documentType: CreateAdultoMayorRequest["documentType"];
    documentNumber: string;
    excludeId?: string;
  }) {
    const existingRecord = await this.adultosMayoresRepository.findByDocument(command);

    if (existingRecord !== null) {
      throw new ConflictException("Ya existe un adulto mayor con ese documento en este centro.");
    }
  }

  private toListItem(record: AdultoMayorRecord): AdultoMayorListItem {
    return adultoMayorListItemSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      documentType: record.documentType,
      documentNumber: record.documentNumber,
      names: record.names,
      surnames: record.surnames,
      phone: record.phone,
      birthDate: record.birthDate,
      age: calculateAgeFromBirthDate(record.birthDate),
      sex: record.sex,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDetail(record: AdultoMayorRecord): AdultoMayorDetail {
    return adultoMayorDetailSchema.parse({
      ...this.toListItem(record),
      firstName: record.firstName,
      middleName: record.middleName,
      firstSurname: record.firstSurname,
      secondSurname: record.secondSurname,
      educationLevel: record.educationLevel,
      disability: record.disability,
      populationGroup: record.populationGroup,
      address: record.address,
      department: record.department,
      departmentId: record.departmentId,
      municipality: record.municipality,
      municipalityId: record.municipalityId,
      zone: record.zone,
      country: record.country,
      phoneSecondary: record.phoneSecondary,
      email: record.email,
      emergencyContactFullName: record.emergencyContactFullName,
      emergencyContactRelationship: record.emergencyContactRelationship,
      emergencyContactPhone: record.emergencyContactPhone,
      emergencyContactAddress: record.emergencyContactAddress,
      bloodType: record.bloodType,
      sisben: record.sisben,
      healthRegime: record.healthRegime,
      epsId: record.epsId,
      epsName: record.epsName,
      eps: record.eps,
      livesWithSomeone: record.livesWithSomeone,
      companion: record.companion,
      economicIncome: record.economicIncome,
      socialProgramBeneficiary: record.socialProgramBeneficiary,
    });
  }

  private throwConflictForUniqueViolation(error: unknown): never | void {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictException("Ya existe un adulto mayor con ese documento en este centro.");
    }
  }
}
