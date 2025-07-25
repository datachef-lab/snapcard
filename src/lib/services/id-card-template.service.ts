import { IdCardTemplate, idCardTemplateTable } from "../db/schema";
import { dbPostgres } from "../db";
import { desc, eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

const BASE_PATH = `${process.env.SNAPCARD_IMAGE_BASE_PATH}/templates`; // Template files to be stored in this path with the template file name as same is id of the template. Also, it can be override if updated

async function saveTemplateFile(id: number, file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.mkdir(BASE_PATH, { recursive: true });
  const filePath = path.join(BASE_PATH, `${id}.jpeg`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function createIdCardTemplate(givenTemplate: IdCardTemplate, templateFile?: File) {
    const [created] = await dbPostgres.insert(idCardTemplateTable).values(givenTemplate).returning();
    if (created && templateFile) {
      await saveTemplateFile(created.id, templateFile);
    }
    return created;
}

export async function getAllIdCardTemplates() {
    return dbPostgres
      .select().from(idCardTemplateTable)
      .where(eq(idCardTemplateTable.disabled, false))
      .orderBy(desc(idCardTemplateTable.admissionYear));
}

export async function getIdCardTemplateById(id: number) {
    return dbPostgres.select().from(idCardTemplateTable).where(eq(idCardTemplateTable.id, id)).then(rows => rows[0]);
}

export async function updateIdCardTemplate(givenTemplate: IdCardTemplate, templateFile: File | null) {
    try {
      console.log("givenTemplate:", givenTemplate);
      const { id, createdAt, updatedAt, ...rest } = givenTemplate;
      console.log("createdAt:", createdAt);
      console.log("updatedAt:", updatedAt, id);
      const [updated] = await dbPostgres.update(idCardTemplateTable).set(rest).where(eq(idCardTemplateTable.id, id!)).returning();
      if (updated && templateFile) {
        await saveTemplateFile(updated.id, templateFile);
      }
      return updated;
    } catch (error) {
      console.log(error)
    }
}

export async function deleteIdCardTemplate(id: number) {
    await dbPostgres.delete(idCardTemplateTable).where(eq(idCardTemplateTable.id, id));
}