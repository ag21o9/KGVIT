import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

export const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        const userPermissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];

        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({
                message: "Forbidden: Permission denied"
            });
        }

        next();
    };
};