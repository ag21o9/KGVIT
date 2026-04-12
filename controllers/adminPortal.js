import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";
import crypto from "crypto";

const LEADS_PERMISSION = "Contact Form Leads";
const SETTINGS_PERMISSION = "Setting";
const DASHBOARD_PERMISSION = "User Management";

const parseBoolean = (value, defaultValue = undefined) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return defaultValue;
};

const uploadBufferToCloudinary = async (file, folder) => {
    if (!file) return null;
    if (!file.buffer) {
        throw new Error("Upload buffer missing. Ensure multer uses memoryStorage.");
    }

    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinaryClient.uploader.upload_stream(
            { folder, resource_type: "auto" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(file.buffer);
    });

    return uploadResult.secure_url;
};

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

const hmac = (key, value) => crypto.createHmac("sha256", key).update(value).digest();

const getS3SigningKey = (secretAccessKey, dateStamp, region, service = "s3") => {
    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    return hmac(kService, "aws4_request");
};

const uploadBufferToS3 = async (file, folder) => {
    if (!file) return null;

    const bucket = process.env.AWS_S3_BUCKET;
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
        throw new Error("S3 credentials are missing. Set AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.");
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const key = folder ? `${folder}/${fileName}` : fileName;
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const amzDate = new Date().toISOString().replace(/[:-]|\..+/g, "") + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(file.buffer);
    const contentType = file.mimetype || "application/octet-stream";
    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

    const canonicalHeaders = [
        `content-type:${contentType}`,
        `host:${host}`,
        `x-amz-content-sha256:${payloadHash}`,
        `x-amz-date:${amzDate}`,
    ].join("\n") + "\n";

    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
        "PUT",
        canonicalUri,
        "",
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = getS3SigningKey(secretAccessKey, dateStamp, region);
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authorization = [
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
        `SignedHeaders=${signedHeaders}`,
        `Signature=${signature}`,
    ].join(", ");

    const response = await fetch(`https://${host}${canonicalUri}`, {
        method: "PUT",
        headers: {
            "Content-Type": contentType,
            "x-amz-content-sha256": payloadHash,
            "x-amz-date": amzDate,
            Authorization: authorization,
        },
        body: file.buffer,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`S3 upload failed: ${response.status} ${errorText}`);
    }

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const uploadBufferToStorage = async (file, folder, provider = "cloudinary") => {
    if (!file) return null;
    if (provider === "s3") {
        return uploadBufferToS3(file, folder);
    }

    return uploadBufferToCloudinary(file, folder);
};

export const permissions = {
    leads: LEADS_PERMISSION,
    settings: SETTINGS_PERMISSION,
    dashboard: DASHBOARD_PERMISSION,
};

export const getLeads = async (req, res, next) => {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: [{ createdAt: "desc" }],
        });

        res.json({ success: true, data: leads });
    } catch (error) {
        next(error);
    }
};

export const getLeadById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lead = await prisma.lead.findUnique({ where: { id } });

        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

export const createLead = async (req, res, next) => {
    try {
        const { name, email, phone, subject, message, courseInterest, documentUrl, source, status } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const uploadedDocumentUrl = await uploadBufferToStorage(req.file, "leads", req.body.provider);

        const lead = await prisma.lead.create({
            data: {
                name,
                email: email ?? null,
                phone: phone ?? null,
                subject: subject ?? null,
                message: message ?? null,
                courseInterest: courseInterest ?? null,
                documentUrl: uploadedDocumentUrl || documentUrl || null,
                source: source ?? null,
                status: status ?? undefined,
            },
        });

        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

export const updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, phone, subject, message, courseInterest, documentUrl, source, status, adminNotes } = req.body;

        const existing = await prisma.lead.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const uploadedDocumentUrl = await uploadBufferToStorage(req.file, "leads", req.body.provider);

        const lead = await prisma.lead.update({
            where: { id },
            data: {
                name: name ?? undefined,
                email: email ?? undefined,
                phone: phone ?? undefined,
                subject: subject ?? undefined,
                message: message ?? undefined,
                courseInterest: courseInterest ?? undefined,
                documentUrl: uploadedDocumentUrl || documentUrl || undefined,
                source: source ?? undefined,
                status: status ?? undefined,
                adminNotes: adminNotes ?? undefined,
            },
        });

        res.json({ success: true, data: lead });
    } catch (error) {
        next(error);
    }
};

export const deleteLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma.lead.findUnique({ where: { id } });

        if (!existing) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        await prisma.lead.delete({ where: { id } });
        res.json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getInquiries = async (req, res, next) => {
    try {
        const inquiries = await prisma.inquiry.findMany({
            orderBy: [{ createdAt: "desc" }],
        });

        res.json({ success: true, data: inquiries });
    } catch (error) {
        next(error);
    }
};

export const createInquiry = async (req, res, next) => {
    try {
        const { name, email, phone, courseInterest, message, documentUrl, status } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const uploadedDocumentUrl = await uploadBufferToStorage(req.file, "inquiries", req.body.provider);

        const inquiry = await prisma.inquiry.create({
            data: {
                name,
                email: email ?? null,
                phone: phone ?? null,
                courseInterest: courseInterest ?? null,
                message: message ?? null,
                documentUrl: uploadedDocumentUrl || documentUrl || null,
                status: status ?? undefined,
            },
        });

        res.status(201).json({ success: true, data: inquiry });
    } catch (error) {
        next(error);
    }
};

export const updateInquiryStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: "status is required" });
        }

        const existing = await prisma.inquiry.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Inquiry not found" });
        }

        const inquiry = await prisma.inquiry.update({
            where: { id },
            data: { status },
        });

        res.json({ success: true, data: inquiry });
    } catch (error) {
        next(error);
    }
};

export const getSettings = async (req, res, next) => {
    try {
        const settings = await prisma.websiteSettings.findUnique({ where: { id: "global" } });
        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

export const upsertSettings = async (req, res, next) => {
    try {
        const {
            websiteName,
            websiteMeta,
            metaKeywords,
            metaDescription,
            email,
            phone,
            whatsappNumber,
            address,
            addressLink,
            socialLinks,
            headerScript,
            footerScript,
            mapEmbed,
            logo,
            whiteLogo,
            favicon,
        } = req.body;

        if (!websiteName) {
            return res.status(400).json({ success: false, message: "websiteName is required" });
        }

        const settings = await prisma.websiteSettings.upsert({
            where: { id: "global" },
            update: {
                websiteName,
                websiteMeta: websiteMeta ?? undefined,
                metaKeywords: metaKeywords ?? undefined,
                metaDescription: metaDescription ?? undefined,
                email: email ?? undefined,
                phone: phone ?? undefined,
                whatsappNumber: whatsappNumber ?? undefined,
                address: address ?? undefined,
                addressLink: addressLink ?? undefined,
                socialLinks: socialLinks ?? undefined,
                headerScript: headerScript ?? undefined,
                footerScript: footerScript ?? undefined,
                mapEmbed: mapEmbed ?? undefined,
                logo: logo ?? undefined,
                whiteLogo: whiteLogo ?? undefined,
                favicon: favicon ?? undefined,
            },
            create: {
                id: "global",
                websiteName,
                websiteMeta: websiteMeta ?? null,
                metaKeywords: metaKeywords ?? null,
                metaDescription: metaDescription ?? null,
                email: email ?? null,
                phone: phone ?? null,
                whatsappNumber: whatsappNumber ?? null,
                address: address ?? null,
                addressLink: addressLink ?? null,
                socialLinks: socialLinks ?? null,
                headerScript: headerScript ?? null,
                footerScript: footerScript ?? null,
                mapEmbed: mapEmbed ?? null,
                logo: logo ?? null,
                whiteLogo: whiteLogo ?? null,
                favicon: favicon ?? null,
            },
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

export const uploadFile = async (req, res, next) => {
    try {
        const { provider = "cloudinary", folder = "uploads" } = req.body;
        const uploaded = await uploadBufferToStorage(req.file, folder, provider);

        if (!uploaded) {
            return res.status(400).json({ success: false, message: "file is required" });
        }

        res.status(201).json({
            success: true,
            data: {
                provider,
                url: uploaded,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getDashboardStats = async (req, res, next) => {
    try {
        const [leadCount, inquiryCount, placementCount, noticeCount, resourceCount, userCount, eventCount, facultyCount] = await Promise.all([
            prisma.lead.count(),
            prisma.inquiry.count(),
            prisma.placement.count(),
            prisma.notice.count(),
            prisma.resource.count(),
            prisma.user.count(),
            prisma.event.count(),
            prisma.faculty.count(),
        ]);

        res.json({
            success: true,
            data: {
                leadCount,
                inquiryCount,
                placementCount,
                noticeCount,
                resourceCount,
                userCount,
                eventCount,
                facultyCount,
            },
        });
    } catch (error) {
        next(error);
    }
};
