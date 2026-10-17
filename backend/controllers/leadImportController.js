import Lead from "../models/Lead.js";
import AppError from "../utils/AppError.js";
import { getImportLimits } from "../config/env.js";
import { sendError } from "../middleware/errorMiddleware.js";
import {
  parseSpreadsheet,
  parseMapping,
  buildImportRows,
  collectLookupKeys,
  markDuplicates,
  describePreview,
  summarize,
} from "../utils/leadImport.js";

// The import takes three requests, each carrying the file again (it is never stored on the server):
//   preview  - read the file, return headers, sample rows and a suggested column mapping
//   validate - apply the mapping, return row errors and possible duplicates
//   import   - apply the mapping again, re-check duplicates against the database, then create the leads

// Users with an import running; a second import by the same user is refused until the first finishes
const importsRunning = new Set();

const readFile = (req) => parseSpreadsheet(req.file, getImportLimits());

// Checks every row and marks the possible duplicates (inside the file and against existing leads)
const analyze = async (req) => {
  const sheet = await readFile(req);
  const items = buildImportRows(sheet, parseMapping(req.body.mapping, sheet.headers.length));
  const matches = await Lead.findImportMatches(collectLookupKeys(items), req.user);
  markDuplicates(items, matches);
  return items;
};

const previewImport = async (req, res) => {
  try {
    res.json({ success: true, data: describePreview(await readFile(req), req.file.originalname) });
  } catch (error) {
    sendError(res, error);
  }
};

const validateImport = async (req, res) => {
  try {
    res.json({ success: true, data: summarize(await analyze(req)) });
  } catch (error) {
    sendError(res, error);
  }
};

const importLeads = async (req, res) => {
  const userId = req.user._id;
  let locked = false;
  try {
    const duplicates = req.body.duplicates ?? "skip";
    if (duplicates !== "skip" && duplicates !== "import") throw new AppError('duplicates must be "skip" or "import"', 400);
    if (importsRunning.has(userId)) throw new AppError("An import is already running. Wait for it to finish.", 409);

    importsRunning.add(userId);
    locked = true;
    const items = await analyze(req);

    const valid = items.filter((item) => item.errors.length === 0);
    const duplicateRows = valid.filter((item) => item.duplicateReasons.length > 0);
    const toCreate = duplicates === "skip" ? valid.filter((item) => item.duplicateReasons.length === 0) : valid;

    let created;
    try {
      created = await Lead.createManyForUser(toCreate, req.user);
    } catch (error) {
      if (error.statusCode) throw error;
      console.error("Lead import failed:", error.code || error.name);
      throw new AppError("The import failed and was rolled back: no leads were imported.", 500);
    }

    res.status(201).json({
      success: true,
      message: `${created.count} leads imported`,
      data: {
        totalRows: items.length,
        imported: created.count,
        skippedDuplicates: duplicates === "skip" ? duplicateRows.length : 0,
        importedDuplicates: duplicates === "import" ? duplicateRows.length : 0,
        failedRows: items.length - valid.length,
        firstLeadId: created.firstLeadId ?? null,
        lastLeadId: created.lastLeadId ?? null,
      },
    });
  } catch (error) {
    sendError(res, error);
  } finally {
    if (locked) importsRunning.delete(userId);
  }
};

export { previewImport, validateImport, importLeads };
