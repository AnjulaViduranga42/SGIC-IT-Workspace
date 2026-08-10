const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin
  const adminEmail = 'admin@sgic.lk';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Workspace Admin',
        role: 'ADMIN',
      }
    });
    console.log('Created default admin:', admin.email);
  } else {
    console.log('Default admin already exists');
  }

  // Create default Task Types
  const taskTypes = ['Maintenance', 'Software Update', 'Network Incident', 'General Support', 'Database Backup'];
  for (const name of taskTypes) {
    await prisma.taskType.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log('Created/verified task types');

  // Create default User Groups
  const userGroups = [
    { name: 'IT Infrastructure', emails: 'infra@sgic.lk,sysadmin@sgic.lk' },
    { name: 'Software Development', emails: 'devs@sgic.lk,lead@sgic.lk' },
    { name: 'QA Team', emails: 'qa@sgic.lk,tester@sgic.lk' },
    { name: 'Help Desk Support', emails: 'support@sgic.lk,agent@sgic.lk' }
  ];
  for (const group of userGroups) {
    await prisma.userGroup.upsert({
      where: { name: group.name },
      update: { emails: group.emails },
      create: group
    });
  }
  console.log('Created/verified user groups');

  // Create default Staff People
  const staffPeople = [
    { name: 'Anjula Dilhara', email: 'anjula@sgic.lk' },
    { name: 'Infra Lead', email: 'infra@sgic.lk' },
    { name: 'QA Engineer', email: 'qa@sgic.lk' },
    { name: 'Support Agent', email: 'support@sgic.lk' }
  ];
  for (const person of staffPeople) {
    await prisma.person.upsert({
      where: { email: person.email },
      update: { name: person.name },
      create: person
    });
  }
  console.log('Created/verified staff people');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
