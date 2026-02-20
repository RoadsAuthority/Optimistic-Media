
import { db } from '../db';
import { users, leaveTypes, leaveBalances, leaveRequests, auditLogs } from '../data/mockData';

export const seedDatabase = async () => {
    try {
        const userCount = await db.users.count();

        if (userCount === 0) {
            console.log('Seeding database with mock data...');

            await db.transaction('rw', db.users, db.leaveTypes, db.leaveBalances, db.leaveRequests, db.auditLogs, async () => {
                await db.users.bulkAdd(users);
                await db.leaveTypes.bulkAdd(leaveTypes);
                await db.leaveBalances.bulkAdd(leaveBalances);
                await db.leaveRequests.bulkAdd(leaveRequests);
                await db.auditLogs.bulkAdd(auditLogs);
            });

            console.log('Database seeded successfully!');
        } else {
            console.log('Database already populated, skipping seed.');
        }
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};
