import { prisma } from '../lib/prisma.js'

const permissions = [
    "User Management",
    "Setting",
    "Page Management",
    "Blog & News",
    "Testimonials",
    "Courses Management",
    "Admission Management",
    "Event Management",
    "Gallery Management",
    "Faculty Management",
    "Notice Board",
    "Student Corner",
    "Achievements & Placements",
    "Contact Form Leads",
    "Careers Management",
    "Downloads Management",
    "Grievance & Anti-Ragging",
    "AI Admission Assistant"
];

async function main() {
    for (const name of permissions) {
        await prisma.permission.upsert({
            where: { name },
            update: {}, // do nothing if exists
            create: {
                name,
                description: `${name} permission`
            }
        });
    }

    console.log("✅ Permissions seeded successfully");

    const adminRole = await prisma.role.findFirst({
        where: { name: "ADMIN" }
    });

    const allPermissions = await prisma.permission.findMany();

    for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: perm.id
                }
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: perm.id
            }
        });
    }
}

main()
    .catch((e) => {
        console.error("❌ Error seeding permissions:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

