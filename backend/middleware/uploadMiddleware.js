import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import AppError from '../utils/AppError.js';
import { getImportLimits } from '../config/env.js';

// Profile pictures are saved in backend/uploads (served at /uploads). The folder is created on first use,
// because it is not part of the repository.
const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const IMAGE_EXTENSIONS = /^\.(jpe?g|png|gif)$/;
const IMAGE_TYPES = /^image\/(jpeg|png|gif)$/;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: user-id-timestamp.ext (the extension was checked by the file filter)
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile-${req.user._id}-${uniqueSuffix}${ext}`);
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const validExtension = IMAGE_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
        if (validExtension && IMAGE_TYPES.test(file.mimetype)) return cb(null, true);
        cb(new AppError('Only JPG, PNG or GIF images are allowed', 400));
    }
});

// Spreadsheet for the lead import: kept in memory (never written to disk), one file, size limit from IMPORT_MAX_FILE_MB.
// The limits are read per request because .env is loaded after this module is imported.
export const importUpload = (req, res, next) =>
    multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: getImportLimits().maxFileBytes, files: 1, fields: 5 },
    }).single('file')(req, res, (error) => {
        if (error?.code === 'LIMIT_FILE_SIZE') {
            error.message = `The file is larger than ${getImportLimits().maxFileBytes / 1024 / 1024} MB`;
        }
        next(error);
    });

export default upload;