import { Router, Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Book } from '../models/Book';
import { Member } from '../models/Member';
import { Fine } from '../models/Fine';
import { SystemConfigModel } from '../models/Setting';

const router = Router();

// GET /api/circulation and /api/circulation/transactions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find().lean();
    return res.json({ success: true, transactions: transactions.map((t) => ({ ...t, id: t.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: err.message });
  }
});

router.get('/transactions', async (_req: Request, res: Response) => {
  try {
    const transactions = await Transaction.find().lean();
    return res.json({ success: true, transactions: transactions.map((t) => ({ ...t, id: t.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: err.message });
  }
});

// POST /api/circulation/issue
router.post('/issue', async (req: Request, res: Response) => {
  try {
    const {
      bookId,
      bookCopyId,
      memberId,
      issuedByUserId = 'admin-1',
      issuedByName = 'Admin Librarian',
      customDueDays,
      notes,
    } = req.body;

    if (!bookId || !bookCopyId || !memberId) {
      return res.status(400).json({ success: false, message: 'bookId, bookCopyId, and memberId are required' });
    }

    const member = await Member.findOne({
      $or: [{ id: memberId }, { memberCardNo: memberId }, { email: memberId }],
    });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (member.status !== 'ACTIVE' && member.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: `Member cannot borrow books. Account status is '${member.status}'.`,
      });
    }

    const book = await Book.findOne({ id: bookId });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const copy = book.copies.find((c) => c.id === bookCopyId || c.barcode === bookCopyId || c.accessionNo === bookCopyId);
    if (!copy) {
      return res.status(404).json({ success: false, message: 'Book copy not found' });
    }

    if (copy.status !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: `Copy is not available (Current status: ${copy.status})` });
    }

    if (copy.isReferenceOnly) {
      return res.status(400).json({ success: false, message: 'This is a Reference-Only copy and cannot be checked out.' });
    }

    const config = (await SystemConfigModel.findOne({ key: 'main_config' })) || {
      fineRatePerDay: 5.0,
      studentMaxLoanDays: 14,
      studentMaxBooks: 4,
      facultyMaxLoanDays: 30,
      facultyMaxBooks: 10,
      maxRenewalLimit: 2,
    };

    const maxAllowed = member.role === 'FACULTY' ? config.facultyMaxBooks || 10 : config.studentMaxBooks || 4;
    const currentLoans = await Transaction.countDocuments({
      memberId: member.id,
      status: { $in: ['ISSUED', 'OVERDUE', 'RENEWED'] },
    });

    if (currentLoans >= maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Member has reached maximum borrowing limit of ${maxAllowed} books.`,
      });
    }

    const loanDays = customDueDays || (member.role === 'FACULTY' ? config.facultyMaxLoanDays || 30 : config.studentMaxLoanDays || 14);
    const now = new Date();
    const issueDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Number(loanDays));
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

    const txId = `tx-${Date.now()}`;
    const transaction = new Transaction({
      id: txId,
      bookCopyId: copy.id,
      bookId: book.id,
      bookTitle: book.title,
      accessionNo: copy.accessionNo,
      barcode: copy.barcode,
      memberId: member.id,
      memberName: member.name,
      memberCardNo: member.memberCardNo,
      memberType: member.role,
      memberDepartment: member.department,
      issuedByUserId,
      issuedByName,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      renewalCount: 0,
      maxRenewals: config.maxRenewalLimit || 2,
      status: 'ISSUED',
      fineAmount: 0,
      notes,
    });

    copy.status = 'ISSUED';
    book.availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
    book.borrowCount = (book.borrowCount || 0) + 1;

    member.currentActiveLoans = currentLoans + 1;

    await Promise.all([transaction.save(), book.save(), member.save()]);

    return res.status(201).json({
      success: true,
      message: `Book '${book.title}' successfully issued to ${member.name}.`,
      transaction,
    });
  } catch (err: any) {
    console.error('Issue error:', err);
    return res.status(500).json({ success: false, message: 'Failed to issue book', error: err.message });
  }
});

// POST /api/circulation/return
router.post('/return', async (req: Request, res: Response) => {
  try {
    const { transactionId, copyBarcodeOrAccession, returnedCondition = 'GOOD', notes } = req.body;

    let transaction: any;
    if (transactionId) {
      transaction = await Transaction.findOne({ id: transactionId });
    } else if (copyBarcodeOrAccession) {
      transaction = await Transaction.findOne({
        $or: [{ barcode: copyBarcodeOrAccession }, { accessionNo: copyBarcodeOrAccession }],
        status: { $in: ['ISSUED', 'OVERDUE', 'RENEWED'] },
      });
    }

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Active loan transaction not found.' });
    }

    const now = new Date();
    const returnDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const config = (await SystemConfigModel.findOne({ key: 'main_config' })) || { fineRatePerDay: 5.0 };
    const fineRate = config.fineRatePerDay || 5.0;

    // Check overdue
    let fineAmount = 0;
    const returnDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(transaction.dueDate.split(' ')[0]);

    if (returnDateOnly > dueDateOnly) {
      const diffDays = Math.max(1, Math.ceil((returnDateOnly.getTime() - dueDateOnly.getTime()) / (1000 * 3600 * 24)));
      fineAmount = diffDays * fineRate;
    }

    transaction.status = 'RETURNED';
    transaction.returnDate = returnDateStr;
    transaction.fineAmount = fineAmount;
    transaction.fineStatus = fineAmount > 0 ? 'UNPAID' : undefined;
    if (notes) transaction.notes = `${transaction.notes || ''} | ${notes}`.trim();

    // Update book copy
    const book = await Book.findOne({ id: transaction.bookId });
    if (book) {
      const copy = book.copies.find((c) => c.id === transaction.bookCopyId || c.barcode === transaction.barcode);
      if (copy) {
        copy.status = 'AVAILABLE';
        copy.condition = returnedCondition;
      }
      book.availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
      await book.save();
    }

    // Update member active loans
    const member = await Member.findOne({ id: transaction.memberId });
    if (member) {
      const remainingLoans = await Transaction.countDocuments({
        memberId: member.id,
        status: { $in: ['ISSUED', 'OVERDUE', 'RENEWED'] },
        id: { $ne: transaction.id },
      });
      member.currentActiveLoans = remainingLoans;
      if (fineAmount > 0) {
        member.pendingFines = (member.pendingFines || 0) + fineAmount;
      }
      await member.save();
    }

    // Create Fine record if overdue
    let createdFine = null;
    if (fineAmount > 0) {
      createdFine = new Fine({
        id: `fine-${Date.now()}`,
        transactionId: transaction.id,
        memberId: transaction.memberId,
        memberName: transaction.memberName,
        memberCardNo: transaction.memberCardNo,
        bookTitle: transaction.bookTitle,
        amount: fineAmount,
        paidAmount: 0,
        reason: 'OVERDUE',
        status: 'UNPAID',
        createdDate: now.toISOString().split('T')[0],
      });
      await createdFine.save();
    }

    await transaction.save();

    return res.json({
      success: true,
      message: `Book '${transaction.bookTitle}' returned successfully.${fineAmount > 0 ? ` Overdue fine assessed: ₹${fineAmount}` : ''}`,
      transaction,
      fine: createdFine,
    });
  } catch (err: any) {
    console.error('Return error:', err);
    return res.status(500).json({ success: false, message: 'Failed to return book', error: err.message });
  }
});

// POST /api/circulation/renew
router.post('/renew', async (req: Request, res: Response) => {
  try {
    const { transactionId, extensionDays } = req.body;

    const transaction = await Transaction.findOne({ id: transactionId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.status === 'RETURNED' || transaction.status === 'LOST') {
      return res.status(400).json({ success: false, message: 'Cannot renew a completed or lost transaction.' });
    }

    const config = (await SystemConfigModel.findOne({ key: 'main_config' })) || { maxRenewalLimit: 2 };
    if (transaction.renewalCount >= (transaction.maxRenewals || config.maxRenewalLimit || 2)) {
      return res.status(400).json({
        success: false,
        message: `Maximum renewal limit of ${transaction.maxRenewals || 2} reached for this loan.`,
      });
    }

    const daysToAdd = Number(extensionDays) || 14;
    const currentDue = new Date(transaction.dueDate.split(' ')[0]);
    currentDue.setDate(currentDue.getDate() + daysToAdd);
    const newDueDateStr = `${currentDue.getFullYear()}-${String(currentDue.getMonth() + 1).padStart(2, '0')}-${String(currentDue.getDate()).padStart(2, '0')}`;

    transaction.dueDate = newDueDateStr;
    transaction.renewalCount += 1;
    transaction.status = 'RENEWED';

    await transaction.save();

    return res.json({
      success: true,
      message: `Book loan renewed until ${newDueDateStr}. Renewal count: ${transaction.renewalCount}.`,
      transaction,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to renew loan', error: err.message });
  }
});

export default router;
