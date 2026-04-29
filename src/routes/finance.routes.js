import authMiddleware from "../middlewares/auth.middleware.js";
import { v4 as uuid } from "uuid";

export async function financeRoutes(fastify) {
    const { prisma } = fastify;

    // Apply auth middleware to all routes in this file
    fastify.addHook("preHandler", authMiddleware);

    // ================= ACCOUNT TREE =================

    // GET /api/finance/accounts - Fetch all accounts in tree structure
    fastify.get("/accounts", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const accounts = await prisma.accountTree.findMany({
                where: { companyId },
                include: {
                    children: true,
                    ledgers: true
                }
            });
            return reply.send({ success: true, items: accounts });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching accounts" });
        }
    });

    // POST /api/finance/add-account - Create a new account in the tree
    fastify.post("/add-account", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            const account = await prisma.accountTree.create({
                data: {
                    id: uuid(),
                    name: body.name,
                    code: body.code,
                    parentId: body.parentId || null,
                    type: body.type, // ASSET, LIABILITY, INCOME, EXPENSE
                    companyId: companyId
                }
            });
            return reply.send({ success: true, message: "Account created", data: account });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating account" });
        }
    });

    // ================= LEDGERS =================

    // GET /api/finance/ledgers - Fetch all ledgers
    fastify.get("/ledgers", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { accountTreeId } = req.query;
            
            const where = { companyId };
            if (accountTreeId) where.accountTreeId = accountTreeId;

            const ledgers = await prisma.ledger.findMany({
                where,
                include: {
                    accountTree: true,
                    subledgers: true
                }
            });
            return reply.send({ success: true, items: ledgers });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching ledgers" });
        }
    });

    // POST /api/finance/add-ledger - Create a new ledger
    fastify.post("/add-ledger", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            const ledger = await prisma.ledger.create({
                data: {
                    id: uuid(),
                    name: body.name,
                    accountTreeId: body.accountTreeId,
                    bifurcated: body.bifurcated || false,
                    companyId: companyId
                }
            });
            return reply.send({ success: true, message: "Ledger created", data: ledger });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating ledger" });
        }
    });

    // ================= SUBLEDGERS =================

    // GET /api/finance/subledgers - Fetch subledgers for a ledger
    fastify.get("/subledgers", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { ledgerId } = req.query;
            
            const where = { companyId };
            if (ledgerId) where.ledgerId = ledgerId;

            const subledgers = await prisma.subLedger.findMany({
                where,
                include: { ledger: true }
            });
            return reply.send({ success: true, items: subledgers });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching subledgers" });
        }
    });

    // POST /api/finance/add-subledger
    fastify.post("/add-subledger", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            const subledger = await prisma.subLedger.create({
                data: {
                    id: uuid(),
                    name: body.name,
                    ledgerId: body.ledgerId,
                    companyId: companyId
                }
            });
            return reply.send({ success: true, message: "Subledger created", data: subledger });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating subledger" });
        }
    });

    // ================= BANKS =================

    // GET /api/finance/banks
    fastify.get("/banks", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const banks = await prisma.bank.findMany({
                where: { companyId }
            });
            return reply.send({ success: true, items: banks });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching banks" });
        }
    });

    // POST /api/finance/add-bank
    fastify.post("/add-bank", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;
            const bank = await prisma.bank.create({
                data: {
                    id: uuid(),
                    name: body.name,
                    accountNumber: body.accountNumber,
                    ifscCode: body.ifscCode,
                    branch: body.branch,
                    companyId: companyId
                }
            });
            return reply.send({ success: true, message: "Bank added", data: bank });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error adding bank" });
        }
    });

    // ================= CHEQUE SERIES =================

    // GET /api/finance/cheque-series
    fastify.get("/cheque-series", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const series = await prisma.chequeSeries.findMany({
                where: { companyId }
            });
            return reply.send({ success: true, items: series });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching cheque series" });
        }
    });

    // POST /api/finance/add-cheque-series
    fastify.post("/add-cheque-series", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { startNumber, endNumber, bankId } = req.body;

            if (!startNumber || !endNumber || !bankId) {
                return reply.code(400).send({ 
                    success: false, 
                    message: "Missing required fields: startNumber, endNumber, and bankId are mandatory." 
                });
            }

            const series = await prisma.chequeSeries.create({
                data: {
                    id: uuid(),
                    startNumber: String(startNumber),
                    endNumber: String(endNumber),
                    currentNumber: String(startNumber),
                    bankId: bankId,
                    companyId: companyId,
                    status: "ACTIVE"
                }
            });
            return reply.send({ success: true, message: "Cheque series added successfully", data: series });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ 
                success: false, 
                message: "Error adding cheque series. Ensure the Bank ID is valid.",
                error: err.message
            });
        }
    });

    // ================= PARTIES =================

    // GET /api/finance/parties - Fetch all parties (Vendors, Customers, etc.)
    fastify.get("/parties", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { type } = req.query;

            const where = { companyId };
            if (type) where.type = type;

            const parties = await prisma.party.findMany({
                where,
                orderBy: { name: "asc" }
            });
            return reply.send({ success: true, items: parties });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching parties" });
        }
    });

    // POST /api/finance/add-party
    fastify.post("/add-party", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            const party = await prisma.party.create({
                data: {
                    id: uuid(),
                    name: body.name,
                    email: body.email,
                    phone: body.phone,
                    address: body.address,
                    panNumber: body.panNumber,
                    gstNumber: body.gstNumber,
                    type: body.type, // VENDOR, CUSTOMER, EMPLOYEE, OTHER
                    companyId: companyId
                }
            });
            return reply.send({ success: true, message: "Party created", data: party });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating party" });
        }
    });

    // ================= TRANSACTIONS =================

    // GET /api/finance/transactions
    fastify.get("/transactions", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { type, startDate, endDate, projectId } = req.query;

            const where = { companyId };
            if (type) where.transactionType = type;
            if (projectId) where.projectId = projectId;
            if (startDate && endDate) {
                where.transactionDate = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const transactions = await prisma.transaction.findMany({
                where,
                include: {
                    entries: {
                        include: {
                            ledger: true,
                            subledger: true
                        }
                    },
                    party: { select: { name: true } },
                    project: { select: { projectName: true } },
                    createdBy: { select: { username: true } }
                },
                orderBy: { transactionDate: "desc" }
            });

            return reply.send({ success: true, items: transactions });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching transactions" });
        }
    });

    // POST /api/finance/add-transaction
    fastify.post("/add-transaction", async (req, reply) => {
        try {
            const { companyId, id: userId } = req.user;
            const { entries, ...transactionData } = req.body;

            if (!entries || entries.length < 2) {
                return reply.code(400).send({ success: false, message: "At least two entries are required (Debit & Credit)" });
            }

            // Validate balancing: Sum of Debits must equal Sum of Credits
            let totalDebit = 0;
            let totalCredit = 0;
            entries.forEach(entry => {
                if (entry.entryType === 'DEBIT') totalDebit += parseFloat(entry.amount);
                else if (entry.entryType === 'CREDIT') totalCredit += parseFloat(entry.amount);
            });

            // Use a small epsilon for float comparison if needed, but here we assume fixed precision from client
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                return reply.code(400).send({ 
                    success: false, 
                    message: `Transaction not balanced. Total Debit (₹${totalDebit.toFixed(2)}) must equal Total Credit (₹${totalCredit.toFixed(2)})` 
                });
            }

            // Use interactive transaction to ensure both transaction and entries are created
            const result = await prisma.$transaction(async (tx) => {
                const transaction = await tx.transaction.create({
                    data: {
                        id: uuid(),
                        transactionType: transactionData.transactionType,
                        transactionDate: new Date(transactionData.transactionDate || new Date()),
                        referenceNumber: transactionData.referenceNumber,
                        narration: transactionData.narration,
                        totalAmount: totalDebit, // Can use either debit or credit since they are equal
                        companyId: companyId,
                        createdById: userId,
                        partyId: transactionData.partyId,
                        projectId: transactionData.projectId,
                        documentUrl: transactionData.documentUrl
                    }
                });

                await tx.transactionEntry.createMany({
                    data: entries.map(entry => ({
                        id: uuid(),
                        transactionId: transaction.id,
                        ledgerId: entry.ledgerId,
                        subledgerId: entry.subledgerId || null,
                        amount: parseFloat(entry.amount),
                        entryType: entry.entryType, // DEBIT, CREDIT
                        narration: entry.narration,
                        companyId: companyId
                    }))
                });

                return transaction;
            });

            return reply.send({ success: true, message: "Transaction created successfully", data: result });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating transaction" });
        }
    });

    // POST /api/finance/receipt - Specialized General Receipt
    fastify.post("/receipt", async (req, reply) => {
        try {
            const { companyId, id: userId } = req.user;
            const { entries, modeDetails, ...transactionData } = req.body;

            // Basic validation
            if (!entries || entries.length < 2) {
                return reply.code(400).send({ success: false, message: "At least two entries are required" });
            }

            const result = await prisma.$transaction(async (tx) => {
                const transaction = await tx.transaction.create({
                    data: {
                        id: uuid(),
                        transactionType: 'RECEIPT',
                        transactionDate: new Date(transactionData.transactionDate || new Date()),
                        referenceNumber: transactionData.referenceNumber,
                        narration: transactionData.narration,
                        totalAmount: transactionData.totalAmount,
                        companyId: companyId,
                        createdById: userId,
                        partyId: transactionData.partyId,
                        projectId: transactionData.projectId
                    }
                });

                await tx.transactionEntry.createMany({
                    data: entries.map(entry => ({
                        id: uuid(),
                        transactionId: transaction.id,
                        ledgerId: entry.ledgerId,
                        subledgerId: entry.subledgerId || null,
                        amount: parseFloat(entry.amount),
                        entryType: entry.entryType,
                        narration: entry.narration,
                        companyId: companyId
                    }))
                });

                if (modeDetails && modeDetails.length > 0) {
                    for (const mode of modeDetails) {
                        const mDetail = await tx.transactionModeDetail.create({
                            data: {
                                id: uuid(),
                                transactionId: transaction.id,
                                type: 'RECEIVED',
                                mode: mode.mode,
                                amount: parseFloat(mode.amount),
                                bankName: mode.bankName,
                                companyBankId: mode.companyBankId,
                                chequeNumber: mode.chequeNumber,
                                chequeDate: mode.chequeDate ? new Date(mode.chequeDate) : null,
                                upiId: mode.upiId,
                                referenceNumber: mode.referenceNumber,
                                transactionDate: new Date(transactionData.transactionDate || new Date()),
                                companyId: companyId,
                                createdById: userId
                            }
                        });

                        if (mode.mode === 'CHEQUE') {
                            await tx.chequeDetail.create({
                                data: {
                                    id: uuid(),
                                    transactionId: transaction.id,
                                    transactionModeDetailId: mDetail.id,
                                    status: 'RECEIVED',
                                    chequeType: 'RECEIVED',
                                    chequeNumber: mode.chequeNumber,
                                    companyId: companyId,
                                    createdById: userId
                                }
                            });
                        }
                    }
                }

                await tx.financeLog.create({
                    data: {
                        id: uuid(),
                        action: 'CREATE',
                        module: 'GENERAL_RECEIPT',
                        recordId: transaction.id,
                        userId: userId,
                        username: req.user.username,
                        companyId: companyId,
                        description: `Created receipt ${transaction.referenceNumber || transaction.id}`
                    }
                });

                return transaction;
            });

            return reply.send({ success: true, message: "Receipt created successfully", data: result });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating receipt" });
        }
    });

    // POST /api/finance/payment - Specialized Payment Voucher
    fastify.post("/payment", async (req, reply) => {
        try {
            const { companyId, id: userId } = req.user;
            const { entries, modeDetails, ...transactionData } = req.body;

            const result = await prisma.$transaction(async (tx) => {
                const transaction = await tx.transaction.create({
                    data: {
                        id: uuid(),
                        transactionType: 'PAYMENT',
                        transactionDate: new Date(transactionData.transactionDate || new Date()),
                        referenceNumber: transactionData.referenceNumber,
                        narration: transactionData.narration,
                        totalAmount: transactionData.totalAmount,
                        companyId: companyId,
                        createdById: userId,
                        partyId: transactionData.partyId,
                        projectId: transactionData.projectId
                    }
                });

                await tx.transactionEntry.createMany({
                    data: entries.map(entry => ({
                        id: uuid(),
                        transactionId: transaction.id,
                        ledgerId: entry.ledgerId,
                        subledgerId: entry.subledgerId || null,
                        amount: parseFloat(entry.amount),
                        entryType: entry.entryType,
                        narration: entry.narration,
                        companyId: companyId
                    }))
                });

                if (modeDetails && modeDetails.length > 0) {
                    for (const mode of modeDetails) {
                        const mDetail = await tx.transactionModeDetail.create({
                            data: {
                                id: uuid(),
                                transactionId: transaction.id,
                                type: 'ISSUED',
                                mode: mode.mode,
                                amount: parseFloat(mode.amount),
                                companyBankId: mode.companyBankId,
                                chequeNumber: mode.chequeNumber,
                                chequeDate: mode.chequeDate ? new Date(mode.chequeDate) : null,
                                transactionDate: new Date(transactionData.transactionDate || new Date()),
                                companyId: companyId,
                                createdById: userId
                            }
                        });

                        if (mode.mode === 'CHEQUE') {
                            await tx.chequeDetail.create({
                                data: {
                                    id: uuid(),
                                    transactionId: transaction.id,
                                    transactionModeDetailId: mDetail.id,
                                    status: 'ISSUED',
                                    chequeType: 'ISSUED',
                                    chequeNumber: mode.chequeNumber,
                                    companyId: companyId,
                                    createdById: userId
                                }
                            });
                        }
                    }
                }

                await tx.financeLog.create({
                    data: {
                        id: uuid(),
                        action: 'CREATE',
                        module: 'PAYMENT_VOUCHER',
                        recordId: transaction.id,
                        userId: userId,
                        username: req.user.username,
                        companyId: companyId,
                        description: `Created payment voucher ${transaction.referenceNumber || transaction.id}`
                    }
                });

                return transaction;
            });

            return reply.send({ success: true, message: "Payment created successfully", data: result });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error creating payment" });
        }
    });

    // GET /api/finance/cheque-details
    fastify.get("/cheque-details", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const cheques = await prisma.chequeDetail.findMany({
                where: { companyId },
                include: {
                    transaction: true,
                    modeDetail: {
                        include: { companyBank: true }
                    }
                }
            });
            return reply.send({ success: true, items: cheques });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching cheque details" });
        }
    });

    // ================= REPORTS =================

    // GET /api/finance/reports/ledger-statement
    fastify.get("/reports/ledger-statement", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { ledgerId, subledgerId, startDate, endDate } = req.query;

            if (!ledgerId) return reply.code(400).send({ success: false, message: "ledgerId is required" });

            const where = {
                companyId,
                ledgerId: ledgerId,
                status: 'ACTIVE',
                transaction: {
                    status: 'ACTIVE'
                }
            };

            if (subledgerId) where.subledgerId = subledgerId;
            if (startDate && endDate) {
                where.transaction.transactionDate = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }

            const entries = await prisma.transactionEntry.findMany({
                where,
                include: {
                    transaction: {
                        include: {
                            party: { select: { name: true } },
                            project: { select: { projectName: true } }
                        }
                    },
                    ledger: true,
                    subledger: true
                },
                orderBy: {
                    transaction: {
                        transactionDate: 'asc'
                    }
                }
            });

            return reply.send({ success: true, items: entries });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating ledger statement" });
        }
    });

    // GET /api/finance/reports/trial-balance
    fastify.get("/reports/trial-balance", async (req, reply) => {
        try {
            const { companyId } = req.user;
            
            // Get all ledgers with their entries
            const ledgers = await prisma.ledger.findMany({
                where: { companyId },
                include: {
                    transactionEntries: {
                        where: {
                            status: 'ACTIVE',
                            transaction: { status: 'ACTIVE' }
                        },
                        select: {
                            amount: true,
                            entryType: true
                        }
                    },
                    accountTree: true
                }
            });

            const balances = ledgers.map(ledger => {
                let totalDebit = 0;
                let totalCredit = 0;
                ledger.transactionEntries.forEach(entry => {
                    if (entry.entryType === 'DEBIT') totalDebit += entry.amount;
                    else totalCredit += entry.amount;
                });

                return {
                    id: ledger.id,
                    name: ledger.name,
                    accountType: ledger.accountTree.type,
                    totalDebit,
                    totalCredit,
                    netBalance: totalDebit - totalCredit
                };
            });

            return reply.send({ success: true, items: balances });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating trial balance" });
        }
    });

    // GET /api/finance/reports/profit-loss
    fastify.get("/reports/profit-loss", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { startDate, endDate } = req.query;

            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.gte = new Date(startDate);
                dateFilter.lte = new Date(endDate);
            }

            const entries = await prisma.transactionEntry.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    transaction: {
                        status: 'ACTIVE',
                        ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter })
                    },
                    ledger: {
                        accountTree: {
                            type: { in: ['INCOME', 'EXPENSE'] }
                        }
                    }
                },
                include: {
                    ledger: {
                        include: { accountTree: true }
                    }
                }
            });

            const report = {
                income: [],
                expense: [],
                totalIncome: 0,
                totalExpense: 0,
                netProfit: 0
            };

            const groups = {};
            entries.forEach(entry => {
                const ledgerId = entry.ledgerId;
                if (!groups[ledgerId]) {
                    groups[ledgerId] = {
                        name: entry.ledger.name,
                        type: entry.ledger.accountTree.type,
                        amount: 0
                    };
                }
                // For Income: Credit is positive, Debit is negative (usually income is credit)
                // For Expense: Debit is positive, Credit is negative (usually expense is debit)
                if (entry.ledger.accountTree.type === 'INCOME') {
                    groups[ledgerId].amount += (entry.entryType === 'CREDIT' ? entry.amount : -entry.amount);
                } else {
                    groups[ledgerId].amount += (entry.entryType === 'DEBIT' ? entry.amount : -entry.amount);
                }
            });

            Object.values(groups).forEach(g => {
                if (g.type === 'INCOME') {
                    report.income.push(g);
                    report.totalIncome += g.amount;
                } else {
                    report.expense.push(g);
                    report.totalExpense += g.amount;
                }
            });

            report.netProfit = report.totalIncome - report.totalExpense;

            return reply.send({ success: true, data: report });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating P&L report" });
        }
    });

    // GET /api/finance/reports/balance-sheet
    fastify.get("/reports/balance-sheet", async (req, reply) => {
        try {
            const { companyId } = req.user;
            
            const entries = await prisma.transactionEntry.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    transaction: { status: 'ACTIVE' },
                    ledger: {
                        accountTree: {
                            type: { in: ['ASSET', 'LIABILITY'] }
                        }
                    }
                },
                include: {
                    ledger: {
                        include: { accountTree: true }
                    }
                }
            });

            const report = {
                assets: [],
                liabilities: [],
                totalAssets: 0,
                totalLiabilities: 0
            };

            const groups = {};
            entries.forEach(entry => {
                const ledgerId = entry.ledgerId;
                if (!groups[ledgerId]) {
                    groups[ledgerId] = {
                        name: entry.ledger.name,
                        type: entry.ledger.accountTree.type,
                        amount: 0
                    };
                }
                // For Assets: Debit is positive
                // For Liabilities: Credit is positive
                if (entry.ledger.accountTree.type === 'ASSET') {
                    groups[ledgerId].amount += (entry.entryType === 'DEBIT' ? entry.amount : -entry.amount);
                } else {
                    groups[ledgerId].amount += (entry.entryType === 'CREDIT' ? entry.amount : -entry.amount);
                }
            });

            Object.values(groups).forEach(g => {
                if (g.type === 'ASSET') {
                    report.assets.push(g);
                    report.totalAssets += g.amount;
                } else {
                    report.liabilities.push(g);
                    report.totalLiabilities += g.amount;
                }
            });

            return reply.send({ success: true, data: report });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating balance sheet" });
        }
    });

    // GET /api/finance/reports/cash-book
    fastify.get("/reports/cash-book", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { startDate, endDate } = req.query;

            const entries = await prisma.transactionEntry.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    transaction: {
                        status: 'ACTIVE',
                        transactionDate: {
                            gte: new Date(startDate || new Date()),
                            lte: new Date(endDate || new Date())
                        }
                    },
                    ledger: {
                        accountTree: {
                            name: { contains: 'Cash', mode: 'insensitive' }
                        }
                    }
                },
                include: {
                    transaction: {
                        include: { createdBy: { select: { username: true } } }
                    },
                    ledger: true
                },
                orderBy: { transaction: { transactionDate: 'asc' } }
            });

            return reply.send({ success: true, items: entries });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating cash book" });
        }
    });

    // GET /api/finance/reports/bank-book
    fastify.get("/reports/bank-book", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { startDate, endDate, bankId } = req.query;

            const where = {
                companyId,
                status: 'ACTIVE',
                transaction: {
                    status: 'ACTIVE',
                    transactionDate: {
                        gte: new Date(startDate || new Date()),
                        lte: new Date(endDate || new Date())
                    }
                },
                ledger: {
                    accountTree: {
                        name: { contains: 'Bank', mode: 'insensitive' }
                    }
                }
            };

            const entries = await prisma.transactionEntry.findMany({
                where,
                include: {
                    transaction: {
                        include: { 
                            createdBy: { select: { username: true } },
                            modeDetails: true
                        }
                    },
                    ledger: true
                },
                orderBy: { transaction: { transactionDate: 'asc' } }
            });

            return reply.send({ success: true, items: entries });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating bank book" });
        }
    });

    // GET /api/finance/reports/day-book
    fastify.get("/reports/day-book", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { date } = req.query;
            const targetDate = new Date(date || new Date());
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            const transactions = await prisma.transaction.findMany({
                where: {
                    companyId,
                    status: 'ACTIVE',
                    transactionDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                },
                include: {
                    entries: { include: { ledger: true } },
                    createdBy: { select: { username: true } }
                },
                orderBy: { transactionDate: 'asc' }
            });

            return reply.send({ success: true, items: transactions });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating day book" });
        }
    });

    // GET /api/finance/reports/brs
    fastify.get("/reports/brs", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const cheques = await prisma.chequeDetail.findMany({
                where: { 
                    companyId,
                    status: { in: ['RECEIVED', 'ISSUED'] } // Pending cheques
                },
                include: {
                    transaction: true,
                    modeDetail: true
                }
            });
            return reply.send({ success: true, items: cheques });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error generating BRS report" });
        }
    });

    // GET /api/finance/logs - Audit Logs
    fastify.get("/logs", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { page = 1, limit = 20, module, action, userId, startDate, endDate } = req.query;
            const skip = (page - 1) * limit;

            const where = {
                companyId,
                ...(module && { module }),
                ...(action && { action }),
                ...(userId && { userId }),
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            };

            const [items, total] = await Promise.all([
                prisma.financeLog.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.financeLog.count({ where })
            ]);

            return reply.send({ success: true, items, total, page: parseInt(page), limit: parseInt(limit) });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Error fetching audit logs" });
        }
    });
}
