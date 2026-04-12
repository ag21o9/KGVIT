import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { prisma } from './lib/prisma.js'
import router from './routes/auth.js'
import userManagementRouter from './routes/users.js'

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", async (req, res) => {
    res.json({ message: "Server is running" });
});

app.use('/api/v1', router);
app.use('/api/v1', userManagementRouter);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});