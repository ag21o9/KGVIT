import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { prisma } from './lib/prisma.js'
import router from './routes/auth.js'
import userManagementRouter from './routes/users.js'
import sliderFacilityRouter from './routes/sliders.js'
import postsRouter from './routes/posts.js'
import coursesRouter from './routes/courses.js'
import facultyRouter from './routes/faculty.js'
import eventsRouter from './routes/events.js'
import achievementsRouter from './routes/achievements.js'

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
app.use('/api/v1', sliderFacilityRouter);
app.use('/api/v1', postsRouter);
app.use('/api/v1', coursesRouter);
app.use('/api/v1', facultyRouter);
app.use('/api/v1', eventsRouter);
app.use('/api/v1', achievementsRouter);

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



if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log('app is running on port', PORT);
    });
}


export default app;