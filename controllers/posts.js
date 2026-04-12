import { prisma } from "../lib/prisma.js";
import { cloudinaryClient } from "../config/cloudinary.config.js";

const BLOG_NEWS_PERMISSION = "Blog & News";

const slugify = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

const parseBoolean = (value, defaultValue = undefined) => {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return defaultValue;
};

const uploadImageBuffer = async (file, folder) => {
    if (!file) return null;
    if (!file.buffer) {
        throw new Error("Upload buffer missing. Ensure multer uses memoryStorage.");
    }

    const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinaryClient.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        stream.end(file.buffer);
    });

    return uploadResult.secure_url;
};

const normalizePostResponse = (post) => {
    const tags = post.postTags?.map((pt) => pt.tag) || [];
    const { postTags, ...rest } = post;
    return { ...rest, tags };
};

const resolveTagIds = async (tx, tagIds = [], tagNames = []) => {
    const resolved = new Set(tagIds.filter(Boolean));

    for (const rawName of tagNames) {
        const name = String(rawName || "").trim();
        if (!name) continue;

        const tag = await tx.tag.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
        });

        resolved.add(tag.id);
    }

    return [...resolved];
};

export const requiredPermission = BLOG_NEWS_PERMISSION;

export const getPosts = async (req, res, next) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: [{ createdAt: "desc" }],
            include: {
                category: true,
                postTags: {
                    include: { tag: true },
                },
            },
        });

        res.json({
            success: true,
            data: posts.map(normalizePostResponse),
        });
    } catch (error) {
        next(error);
    }
};

export const getPostBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const post = await prisma.post.findUnique({
            where: { slug },
            include: {
                category: true,
                postTags: {
                    include: { tag: true },
                },
            },
        });

        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        res.json({ success: true, data: normalizePostResponse(post) });
    } catch (error) {
        next(error);
    }
};

export const createPost = async (req, res, next) => {
    try {
        const {
            title,
            slug,
            excerpt,
            content,
            metaTitle,
            metaDescription,
            categoryId,
            isPublished,
            publishedAt,
            tagIds = [],
            tagNames = [],
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "title and content are required",
            });
        }

        const finalSlug = slugify(slug || title);
        if (!finalSlug) {
            return res.status(400).json({ success: false, message: "Invalid slug" });
        }

        if (categoryId) {
            const category = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!category) {
                return res.status(400).json({ success: false, message: "Invalid categoryId" });
            }
        }

        const uploadedCoverImage = await uploadImageBuffer(req.file, "posts");
        const coverImage = uploadedCoverImage || req.body.coverImage || null;

        const created = await prisma.$transaction(async (tx) => {
            const post = await tx.post.create({
                data: {
                    title,
                    slug: finalSlug,
                    excerpt: excerpt ?? null,
                    content,
                    coverImage,
                    metaTitle: metaTitle ?? null,
                    metaDescription: metaDescription ?? null,
                    categoryId: categoryId || null,
                    isPublished: parseBoolean(isPublished, false),
                    publishedAt: publishedAt ? new Date(publishedAt) : null,
                },
            });

            const resolvedTagIds = await resolveTagIds(tx, tagIds, tagNames);
            if (resolvedTagIds.length) {
                await tx.postTag.createMany({
                    data: resolvedTagIds.map((tagId) => ({ postId: post.id, tagId })),
                    skipDuplicates: true,
                });
            }

            return post.id;
        });

        const post = await prisma.post.findUnique({
            where: { id: created },
            include: {
                category: true,
                postTags: { include: { tag: true } },
            },
        });

        res.status(201).json({ success: true, data: normalizePostResponse(post) });
    } catch (error) {
        console.log(error)
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            title,
            slug,
            excerpt,
            content,
            metaTitle,
            metaDescription,
            categoryId,
            isPublished,
            publishedAt,
            tagIds,
            tagNames,
        } = req.body;

        const existing = await prisma.post.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        if (categoryId) {
            const category = await prisma.category.findUnique({ where: { id: categoryId } });
            if (!category) {
                return res.status(400).json({ success: false, message: "Invalid categoryId" });
            }
        }

        const uploadedCoverImage = await uploadImageBuffer(req.file, "posts");

        await prisma.$transaction(async (tx) => {
            await tx.post.update({
                where: { id },
                data: {
                    title: title ?? undefined,
                    slug: slug ? slugify(slug) : undefined,
                    excerpt: excerpt ?? undefined,
                    content: content ?? undefined,
                    coverImage: uploadedCoverImage || req.body.coverImage || undefined,
                    metaTitle: metaTitle ?? undefined,
                    metaDescription: metaDescription ?? undefined,
                    categoryId:
                        categoryId === null || categoryId === ""
                            ? null
                            : categoryId ?? undefined,
                    isPublished: parseBoolean(isPublished, undefined),
                    publishedAt: publishedAt ? new Date(publishedAt) : undefined,
                },
            });

            const hasTagsInput = Array.isArray(tagIds) || Array.isArray(tagNames);
            if (hasTagsInput) {
                const resolvedTagIds = await resolveTagIds(
                    tx,
                    Array.isArray(tagIds) ? tagIds : [],
                    Array.isArray(tagNames) ? tagNames : []
                );

                await tx.postTag.deleteMany({ where: { postId: id } });

                if (resolvedTagIds.length) {
                    await tx.postTag.createMany({
                        data: resolvedTagIds.map((tagId) => ({ postId: id, tagId })),
                        skipDuplicates: true,
                    });
                }
            }
        });

        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                category: true,
                postTags: {
                    include: { tag: true },
                },
            },
        });

        res.json({ success: true, data: normalizePostResponse(post) });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Slug already exists" });
        }
        next(error);
    }
};

export const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await prisma.post.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.postTag.deleteMany({ where: { postId: id } });
            await tx.post.delete({ where: { id } });
        });

        res.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const getCategories = async (req, res, next) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const category = await prisma.category.create({
            data: { name: String(name).trim() },
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        next(error);
    }
};

export const getTags = async (req, res, next) => {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: "asc" },
        });

        res.json({ success: true, data: tags });
    } catch (error) {
        next(error);
    }
};

export const createTag = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }

        const tag = await prisma.tag.create({
            data: { name: String(name).trim() },
        });

        res.status(201).json({ success: true, data: tag });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Tag already exists" });
        }
        next(error);
    }
};
