import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { departments, epsCatalog, municipalities } from "../../../database/schema";
import { AdultosMayoresImportParser } from "../domain/adultos-mayores-import-parser";

const TEMPLATE_FILENAME = "plantilla-importacion-adultos-mayores-v1.xlsx";

@Injectable()
export class AdultosMayoresImportTemplateService {
  constructor(private readonly database: DatabaseService) {}

  async generateTemplate() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CuidarTe";
    workbook.created = new Date();
    workbook.modified = new Date();

    const parser = new AdultosMayoresImportParser();
    const headers = parser.getExpectedHeaders();

    const dataSheet = workbook.addWorksheet("Adultos mayores", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const instructionsSheet = workbook.addWorksheet("Instrucciones");
    const catalogosSheet = workbook.addWorksheet("Catalogos");
    const ubicacionesSheet = workbook.addWorksheet("Ubicaciones");
    const epsSheet = workbook.addWorksheet("EPS");
    const metadataSheet = workbook.addWorksheet("_metadata");
    metadataSheet.state = "hidden";

    const activeDepartments = await this.database.db
      .select({
        id: departments.id,
        code: departments.code,
        name: departments.name,
      })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));
    const activeMunicipalities = await this.database.db
      .select({
        id: municipalities.id,
        code: municipalities.code,
        departmentId: municipalities.departmentId,
        name: municipalities.name,
      })
      .from(municipalities)
      .where(eq(municipalities.isActive, true))
      .orderBy(asc(municipalities.name));
    const epsList = await this.database.db
      .select({
        code: epsCatalog.code,
        name: epsCatalog.name,
      })
      .from(epsCatalog)
      .where(eq(epsCatalog.isActive, true))
      .orderBy(asc(epsCatalog.name));
    const exampleDepartment = activeDepartments[0] ?? null;
    const exampleMunicipality =
      activeMunicipalities.find(
        (municipality) => municipality.departmentId === exampleDepartment?.id,
      ) ?? null;
    const exampleEps = epsList[0] ?? null;

    dataSheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 2, 18),
      style: { numFmt: "@" },
    }));

    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDDEFE7" },
    };
    const exampleRow = headers.reduce<Record<string, string>>((accumulator, header) => {
      accumulator[header] = "";
      return accumulator;
    }, {});
    exampleRow.tipo_documento = "CC";
    exampleRow.numero_documento = "1000000000";
    exampleRow.primer_nombre = "Maria";
    exampleRow.primer_apellido = "Gomez";
    exampleRow.fecha_nacimiento = "1950-01-01";
    exampleRow.sexo = "Femenino";
    exampleRow.direccion = "Calle 1 # 2-3";
    exampleRow.codigo_departamento = exampleDepartment?.code ?? "05";
    exampleRow.codigo_municipio = exampleMunicipality?.code ?? "05001";
    exampleRow.zona = "Urbana";
    exampleRow.tipo_sangre = "O+";
    exampleRow.codigo_eps = exampleEps?.code ?? "";
    exampleRow.vive_con_alguien = "Si";
    exampleRow.beneficiario_programa_social = "No";
    dataSheet.addRow(exampleRow);

    dataSheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    instructionsSheet.addRows([
      ["Plantilla de importacion de adultos mayores"],
      ["1. Solo edita la hoja 'Adultos mayores'."],
      ["2. No cambies los encabezados ni el orden de las columnas."],
      ["3. Usa texto para documentos, codigos DIVIPOLA, telefonos y EPS."],
      [
        "4. Si tipo_documento y numero_documento ya existen en el centro, la fila actualiza ese adulto mayor.",
      ],
      [
        "5. En una actualizacion, las celdas opcionales vacias conservan el valor registrado actualmente.",
      ],
      ["6. El archivo soportado es .xlsx y tiene un maximo de 1.000 filas de datos."],
      ["7. Para tipo_sangre usa valores como O+, A-, AB+ o Desconocido."],
      ["8. Para codigo_eps consulta la hoja 'EPS' y copia el codigo exacto de una EPS activa."],
    ]);
    instructionsSheet.getColumn(1).width = 96;

    catalogosSheet.addRows([
      ["campo", "valores"],
      ["tipo_documento", "CC, CE, Pasaporte, Otro"],
      ["sexo", "Femenino, Masculino, Otro"],
      ["zona", "Urbana, Rural"],
      ["vive_con_alguien", "Si, No"],
      ["beneficiario_programa_social", "Si, No"],
      ["tipo_sangre", "A+, A-, B+, B-, AB+, AB-, O+, O-, Desconocido"],
      [
        "codigo_eps",
        "Usa un codigo existente de la hoja EPS. Ejemplo: codigo_eps de una EPS activa",
      ],
    ]);
    catalogosSheet.getColumn(1).width = 28;
    catalogosSheet.getColumn(2).width = 48;

    ubicacionesSheet.columns = [
      { header: "codigo_departamento", key: "codigo_departamento", width: 22 },
      { header: "departamento", key: "departamento", width: 28 },
      { header: "codigo_municipio", key: "codigo_municipio", width: 20 },
      { header: "municipio", key: "municipio", width: 30 },
    ];
    ubicacionesSheet.getRow(1).font = { bold: true };
    for (const department of activeDepartments) {
      const municipalitiesByDepartment = activeMunicipalities.filter(
        (municipality) => municipality.departmentId === department.id,
      );

      for (const municipality of municipalitiesByDepartment) {
        ubicacionesSheet.addRow({
          codigo_departamento: department.code ?? "",
          departamento: department.name,
          codigo_municipio: municipality.code ?? "",
          municipio: municipality.name,
        });
      }
    }

    epsSheet.columns = [
      { header: "codigo_eps", key: "codigo_eps", width: 20 },
      { header: "nombre_eps", key: "nombre_eps", width: 40 },
    ];
    epsSheet.getRow(1).font = { bold: true };
    for (const eps of epsList) {
      epsSheet.addRow({
        codigo_eps: eps.code,
        nombre_eps: eps.name,
      });
    }

    metadataSheet.addRows([
      ["template_key", parser.getTemplateKey()],
      ["template_version", String(parser.getTemplateVersion())],
      ["generated_at", new Date().toISOString()],
    ]);

    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      filename: TEMPLATE_FILENAME,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }
}
