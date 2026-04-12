
import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'


import dotenv from "dotenv";
dotenv.config();

const storage = multer.memoryStorage()

const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'))
    }
    cb(null, true)
}

export const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: Number(process.env.MULTER_IMAGE_MAX_BYTES || 5 * 1024 * 1024),
    },
})

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dtunnd3zt',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

export const cloudinaryClient = cloudinary