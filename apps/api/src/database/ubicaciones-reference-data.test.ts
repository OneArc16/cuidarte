import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import {
  loadUbicacionesReferenceData,
  parseUbicacionesCsv,
} from "./ubicaciones-reference-data";

const sampleCsv = [
  "cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio,longitud,latitud",
  "11,BOGOTA D.C.,11001,BOGOTA D.C.,Municipio,-74.0721,4.7110",
  "05,ANTIOQUIA,05001,MEDELLIN,Municipio,-75.5636,6.2518",
  "05,ANTIOQUIA,05899,AREA NO MUNICIPALIZADA,Área no municipalizada,-75.0,6.0",
  "88,SAN ANDRES,88001,SAN ANDRES,Isla,-81.7070,12.5833",
].join("\n");

describe("DIVIPOLA reference data", () => {
  it("loads the catalog from a CSV source and reports the parsed snapshot metadata", async () => {
    const referenceData = await loadUbicacionesReferenceData(async () => new Response(sampleCsv));

    assert.equal(
      referenceData.checksumSha256,
      createHash("sha256").update(sampleCsv).digest("hex"),
    );
    assert.equal(referenceData.sourceRowCount, 4);
    assert.deepEqual(referenceData.departments, [
      { code: "05", name: "ANTIOQUIA" },
      { code: "11", name: "BOGOTA D.C." },
      { code: "88", name: "SAN ANDRES" },
    ]);
    assert.deepEqual(referenceData.municipalities, [
      {
        code: "05001",
        departmentCode: "05",
        name: "MEDELLIN",
      },
      {
        code: "11001",
        departmentCode: "11",
        name: "BOGOTA D.C.",
      },
      {
        code: "88001",
        departmentCode: "88",
        name: "SAN ANDRES",
      },
    ]);
  });

  it("ignores rows that are not municipios or islas", () => {
    const referenceData = parseUbicacionesCsv(sampleCsv);

    assert.equal(referenceData.municipalities.length, 3);
    assert.ok(referenceData.municipalities.every((municipality) => municipality.code !== "05899"));
  });

  it("reconoce el encabezado vigente de DIVIPOLA", () => {
    const referenceData = parseUbicacionesCsv(
      [
        "Codigo Departamento,Nombre Departamento,Codigo Municipio,Nombre Municipio,Tipo: Municipio / Isla / Area no municipalizada",
        "11,BOGOTA D.C.,11001,BOGOTA D.C.,Municipio",
      ].join("\n"),
    );

    assert.deepEqual(referenceData.departments, [{ code: "11", name: "BOGOTA D.C." }]);
    assert.deepEqual(referenceData.municipalities, [
      { code: "11001", departmentCode: "11", name: "BOGOTA D.C." },
    ]);
  });

  it("keeps departments that only appear in filtered rows", () => {
    const referenceData = parseUbicacionesCsv(
      [
        "cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio,longitud,latitud",
        "99,DEPARTAMENTO FILTRADO,99999,AREA ESPECIAL,Área no municipalizada,-75.0,6.0",
        "11,BOGOTA D.C.,11001,BOGOTA D.C.,Municipio,-74.0721,4.7110",
      ].join("\n"),
    );

    assert.deepEqual(referenceData.departments, [
      { code: "11", name: "BOGOTA D.C." },
      { code: "99", name: "DEPARTAMENTO FILTRADO" },
    ]);
    assert.deepEqual(referenceData.municipalities, [
      {
        code: "11001",
        departmentCode: "11",
        name: "BOGOTA D.C.",
      },
    ]);
  });

  it("rejects duplicate municipality codes", () => {
    assert.throws(
      () =>
        parseUbicacionesCsv(
          [
            "cod_dpto,dpto,cod_mpio,nom_mpio,tipo_municipio",
            "11,BOGOTA D.C.,11001,BOGOTA D.C.,Municipio",
            "11,BOGOTA D.C.,11001,OTRO NOMBRE,Municipio",
          ].join("\n"),
        ),
      /Municipio duplicado/,
    );
  });

  it("rejects CSV files missing the required DIVIPOLA headers", () => {
    assert.throws(
      () =>
        parseUbicacionesCsv(
          [
            "cod_dpto,dpto,nom_mpio,tipo_municipio",
            "11,BOGOTA D.C.,BOGOTA D.C.,Municipio",
          ].join("\n"),
        ),
      /No fue posible identificar las columnas necesarias de DIVIPOLA/,
    );
  });
});
