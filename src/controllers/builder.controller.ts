import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import fs from "fs";
import path from "path";
import { getDMMF } from "@prisma/internals";

function parseModelType(doc?: string) {
  if (!doc) return "unknown";
  if (doc.includes("@type master")) return "master";
  if (doc.includes("@type transaction")) return "transaction";
  return "unknown";
}

const builderController = {
  async getSchema(req: AuthRequest, res: Response) {
    if (req.user?.role !== "SUPERADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    const dmmf = await getDMMF({ datamodel: schema });
    const datamodel = dmmf.datamodel;

    const sanitized = {
      models: datamodel.models.map((model) => ({
        name: model.name,
        type: parseModelType(model.documentation), // 🔥 INI KUNCINYA
        fields: model.fields
          .filter((f) => f.name !== "password") //sembunyikan password
          .map((f) => ({
            name: f.name,
            type: f.type,
            kind: f.kind,
            isRequired: f.isRequired,
            isList: f.isList,
            isId: f.isId,
            isRelation: f.kind === "object",
            documentation: f.documentation, // optional
          })),
      })),
      enums: datamodel.enums.map((e) => ({
        name: e.name,
        values: e.values.map((v) => v.name),
      })),
    };

    return res.json(sanitized);
  },
};

export default builderController;
