import { prisma } from '../lib/prisma.js'


async function main() {
    console.log("🚀 Seeding Admin...");

    // 1. Ensure ADMIN role exists
    const adminRole = await prisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: {
            name: "ADMIN"
        }
    });

    console.log("✅ Admin role ready");

    // 2. Get all permissions
    const permissions = await prisma.permission.findMany();

    // 3. Assign all permissions to ADMIN role
    for (const perm of permissions) {
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

    console.log("✅ All permissions assigned to ADMIN");

    // 4. Create admin user (if not exists)
    const email = "admin@gmail.com";
    const password = "admin123";

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (!existingUser) {


        await prisma.user.create({
            data: {
                name: "Super Admin",
                email,
                password,
                roleId: adminRole.id
            }
        });

        console.log("✅ Admin user created");
        console.log("📧 Email:", email);
        console.log("🔑 Password:", password);
    } else {
        console.log("ℹ️ Admin user already exists");
    }

    console.log("🎉 Setup complete!");
}

main()
    .catch((e) => {
        console.error("❌ Error:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });