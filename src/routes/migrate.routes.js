import { v4 as uuid } from "uuid";
import * as XLSX from "xlsx";
import authMiddleware from "../middlewares/auth.middleware.js";

export async function migrateRoutes(fastify) {
    const { prisma } = fastify;

    // Apply auth middleware
    fastify.addHook("preHandler", authMiddleware);

    fastify.post("/import-accounts", async (request, reply) => {
        const { companyId, id: userId } = request.user;
        const data = await request.file();

        if (!data) {
            return reply.status(400).send({ success: false, message: "No file uploaded" });
        }

        try {
            const buffer = await data.toBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Expected headers: Account Group, Account Name, Sub-Account Name, Balance, Balance Type (DEBIT/CREDIT)
            const dataRows = rows.slice(1);

            let successCount = 0;
            let errorLog = [];

            // Process within a transaction
            await prisma.$transaction(async (tx) => {
                // Fetch existing groups to avoid duplication
                const existingGroups = await tx.accountTree.findMany({ 
                    where: { companyId } 
                });
                const groupMap = new Map(existingGroups.map(g => [g.name.toUpperCase(), g.id]));

                for (let i = 0; i < dataRows.length; i++) {
                    const [groupName, ledgerName, subledgerName, balance, balanceType] = dataRows[i];

                    if (!ledgerName) continue;

                    try {
                        // 1. Ensure Account Group exists
                        let groupId = groupMap.get(groupName?.toString().toUpperCase());
                        if (!groupId && groupName) {
                            const newGroup = await tx.accountTree.create({
                                data: {
                                    id: uuid(),
                                    name: groupName.toString(),
                                    code: groupName.toString().substring(0, 5).toUpperCase() + Math.floor(Math.random() * 1000),
                                    type: "ASSET", // Defaulting to asset
                                    companyId: companyId
                                }
                            });
                            groupId = newGroup.id;
                            groupMap.set(groupName.toString().toUpperCase(), groupId);
                        }

                        if (!groupId) {
                            errorLog.push(`Row ${i + 2}: Account Group "${groupName}" missing.`);
                            continue;
                        }

                        // 2. Create Ledger
                        const ledger = await tx.ledger.create({
                            data: {
                                id: uuid(),
                                name: ledgerName.toString(),
                                accountTreeId: groupId,
                                companyId: companyId
                            }
                        });

                        // 3. Create Subledger if present
                        let targetSubledgerId = null;
                        if (subledgerName) {
                            const subledger = await tx.subLedger.create({
                                data: {
                                    id: uuid(),
                                    name: subledgerName.toString(),
                                    ledgerId: ledger.id,
                                    companyId: companyId
                                }
                            });
                            targetSubledgerId = subledger.id;
                        }

                        // 4. Create Opening Transaction if balance > 0
                        const amount = parseFloat(balance);
                        if (amount && amount > 0) {
                            const transaction = await tx.transaction.create({
                                data: {
                                    id: uuid(),
                                    transactionType: "OPENING",
                                    transactionDate: new Date(),
                                    totalAmount: amount,
                                    companyId: companyId,
                                    createdById: userId,
                                    narration: `Opening balance migration for ${ledgerName}`
                                }
                            });

                            await tx.transactionEntry.create({
                                data: {
                                    id: uuid(),
                                    transactionId: transaction.id,
                                    ledgerId: ledger.id,
                                    subledgerId: targetSubledgerId,
                                    amount: amount,
                                    entryType: (balanceType?.toString().toUpperCase() === "CREDIT") ? "CREDIT" : "DEBIT",
                                    companyId: companyId
                                }
                            });
                        }

                        successCount++;
                    } catch (err) {
                        errorLog.push(`Row ${i + 2}: ${err.message}`);
                    }
                }
            });

            return reply.send({
                success: true,
                message: `Imported ${successCount} accounts successfully.`,
                errors: errorLog
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: `Failed to process file: ${error.message}` });
        }
    });
}
