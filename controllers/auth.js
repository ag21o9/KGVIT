import { prisma } from '../lib/prisma.js'
import jwt from 'jsonwebtoken'

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            }
        });


        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const permissions = user.role.permissions.map(
            (rp) => rp.permission.name
        );

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role.name,
                permissions
            },
            process.env.JWT_SECRET
        );

        // compare password
        const isMatch = password === user.password

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.json({
            message: "Login successful",
            token,
            user
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Login failed" });
    }
};

export const signup = async (req, res) => {
    try {
        const { name, email, password, roleId } = req.body;

        // check existing user
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // get default role (STAFF or ADMIN)
        const role = await prisma.role.findUnique({
            where: { id: roleId } 
        });


        if (!role) {
            return res.status(500).json({ message: "Role not Found" });
        }

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password,
                roleId: role.id
            },
            include: { role: true }
        });

        res.status(201).json({
            message: "User created successfully",
            user
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Signup failed" });
    }
};