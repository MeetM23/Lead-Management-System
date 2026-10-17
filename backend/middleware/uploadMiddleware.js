import multer from 'multer';
import path from 'path';
import { getImportLimits } from '../config/env.js';

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Generate unique filename: user-id-timestamp.ext
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile-${req.user._id}-${uniqueSuffix}${ext}`);
    }
});

// Check file type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Images Only!'));
    }
}

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
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