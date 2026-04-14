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
import noticesRouter from './routes/notices.js'
import placementRouter from './routes/placement.js'
import resourcesRouter from './routes/resouces.js'
import inquiryRouter from './routes/inquiry.js'
import settingsRouter from './routes/settings.js'
import leadsRouter from './routes/leads.js'
import dashRouter from './routes/dashboard.js'
import testimonialsRouter from './routes/testimonials.js'
import feedbackRouter from './routes/feedbacks.js'

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", async (req, res) => {
    res.json({ message: "Server is running" });
});

app.use('/api/v1/main', router);
app.use('/api/v1/um', userManagementRouter);
app.use('/api/v1/sf', sliderFacilityRouter);
app.use('/api/v1/ps', postsRouter);
app.use('/api/v1/cr', coursesRouter);
app.use('/api/v1/fr', facultyRouter);
app.use('/api/v1/er', eventsRouter);
app.use('/api/v1/ar', achievementsRouter);
app.use('/api/v1/nr', noticesRouter);
app.use('/api/v1/pr', placementRouter);
app.use('/api/v1/rr', resourcesRouter);
app.use('/api/v1/ir', inquiryRouter);
app.use('/api/v1/sr', settingsRouter);
app.use('/api/v1/lr', leadsRouter);
app.use('/api/v1/dash', dashRouter);
app.use('/api/v1/testimonials', testimonialsRouter);
app.use('/api/v1/student-corner', feedbackRouter);

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