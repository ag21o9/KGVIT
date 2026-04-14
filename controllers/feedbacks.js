import { prisma } from "../lib/prisma.js";

const STUDENT_CORNER_PERMISSION = "StudentCorner";

const QUESTION_TYPES = [
    "COURSE_RELEVANCE",
    "LEARNING_VALUE",
    "ACADEMIC_ACTIVITIES",
    "CAMPUS_ENVIRONMENT",
    "INFRASTRUCTURE",
    "FACULTY_QUALITY",
    "ADDON_COURSES",
    "LIBRARY",
    "GRIEVANCE_SYSTEM",
    "SPORTS",
    "PLACEMENT_SUPPORT",
    "SAFE_ENVIRONMENT",
    "COLLEGE_INFRA",
    "DISCIPLINE",
    "COMMUNICATION",
    "COUNSELLING",
    "REGULAR_CLASSES",
    "ADMISSION_PROCESS",
    "CO_CURRICULAR",
    "ANTI_RAGGING",
    "STUDENT_PARTICIPATION",
    "LIBRARY_PARENT",
];

const RATING_TYPES = ["EXCELLENT", "VERY_GOOD", "GOOD", "AVERAGE", "SATISFACTORY"];

const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

const formatValidationErrors = (errors) => ({
    success: false,
    message: "Validation failed",
    errors,
});

const validateCreateFeedbackBody = (body) => {
    const errors = [];

    if (!isNonEmptyString(body.studentName)) {
        errors.push("studentName is required");
    }

    if (!isNonEmptyString(body.class)) {
        errors.push("class is required");
    }

    if (!isNonEmptyString(body.session)) {
        errors.push("session is required");
    }

    if (!isNonEmptyString(body.studentId)) {
        errors.push("studentId is required");
    }

    if (!isNonEmptyString(body.departmentId)) {
        errors.push("departmentId is required");
    }

    if (!isNonEmptyString(body.achievements)) {
        errors.push("achievements is required");
    }

    if (!Array.isArray(body.responses) || body.responses.length === 0) {
        errors.push("responses must be a non-empty array");
    } else {
        body.responses.forEach((response, index) => {
            if (!response || typeof response !== "object") {
                errors.push(`responses[${index}] must be an object`);
                return;
            }

            if (!QUESTION_TYPES.includes(response.question)) {
                errors.push(
                    `responses[${index}].question must be one of: ${QUESTION_TYPES.join(", ")}`
                );
            }

            if (!RATING_TYPES.includes(response.rating)) {
                errors.push(
                    `responses[${index}].rating must be one of: ${RATING_TYPES.join(", ")}`
                );
            }
        });
    }

    return errors;
};

export const requiredPermission = STUDENT_CORNER_PERMISSION;

export const createFeedback = async (req, res, next) => {
    try {
        const {
            studentName,
            class: studentClass,
            session,
            studentId,
            departmentId,
            achievements,
            responses,
        } = req.body;

        const validationErrors = validateCreateFeedbackBody(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json(formatValidationErrors(validationErrors));
        }

        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { id: true },
        });

        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Invalid departmentId",
            });
        }

        const feedback = await prisma.studentFeedback.create({
            data: {
                studentName: studentName.trim(),
                class: studentClass.trim(),
                session: session.trim(),
                studentId: studentId.trim(),
                departmentId,
                achievements: achievements.trim(),
                responses: {
                    create: responses.map((response) => ({
                        question: response.question,
                        rating: response.rating,
                    })),
                },
            },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
                responses: true,
            },
        });

        return res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        console.log(error)
        next(error);
    }
};

export const getAllFeedback = async (req, res, next) => {
    try {
        const feedbacks = await prisma.studentFeedback.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                department: {
                    select: { id: true, name: true, slug: true },
                },
                responses: true,
            },
        });

        return res.json({ success: true, data: feedbacks });
    } catch (error) {
        next(error);
    }
};

export const getFeedbackAnalytics = async (req, res, next) => {
    try {
        const [totalFeedback, responses, departmentStats] = await Promise.all([
            prisma.studentFeedback.count(),
            prisma.feedbackResponse.findMany({
                select: {
                    question: true,
                    rating: true,
                },
            }),
            prisma.studentFeedback.groupBy({
                by: ["departmentId"],
                _count: {
                    _all: true,
                },
            }),
        ]);

        const ratingDistribution = RATING_TYPES.reduce((acc, rating) => {
            acc[rating] = 0;
            return acc;
        }, {});

        const questionWiseRatings = QUESTION_TYPES.reduce((acc, question) => {
            acc[question] = RATING_TYPES.reduce((ratingAcc, rating) => {
                ratingAcc[rating] = 0;
                return ratingAcc;
            }, {});
            return acc;
        }, {});

        responses.forEach((response) => {
            ratingDistribution[response.rating] += 1;
            questionWiseRatings[response.question][response.rating] += 1;
        });

        const departments = await prisma.department.findMany({
            where: {
                id: {
                    in: departmentStats.map((item) => item.departmentId),
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        const departmentMap = new Map(departments.map((item) => [item.id, item.name]));

        const departmentFeedbackCount = departmentStats.map((item) => ({
            departmentId: item.departmentId,
            departmentName: departmentMap.get(item.departmentId) || "Unknown",
            total: item._count._all,
        }));

        return res.json({
            success: true,
            data: {
                totalFeedback,
                totalResponses: responses.length,
                ratingDistribution,
                questionWiseRatings,
                departmentFeedbackCount,
            },
        });
    } catch (error) {
        next(error);
    }
};
