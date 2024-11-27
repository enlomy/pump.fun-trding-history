import { PrismaClient } from '@prisma/client';
import { TransactionType } from '../type';

const prisma = new PrismaClient();

export const createDoc = async (user: string, token: string, tokenAmount: number, solAmount: number, type: TransactionType, sig: string) => {
    try {
        // Create a new 
        await prisma.transaction.create({
            data: {
                user,
                token,
                tokenAmount,
                solAmount,
                type,
                sig
            },
        });
    } catch (error) {
        console.error("Error creating document:", error);
    }
}