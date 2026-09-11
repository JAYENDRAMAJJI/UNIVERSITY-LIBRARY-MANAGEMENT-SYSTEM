import { Router, Request, Response } from 'express';
import { Book, Category, Author, Publisher } from '../models/Book';
import { Rack } from '../models/Rack';

const router = Router();

// GET /api/books - Get all books
router.get('/', async (_req: Request, res: Response) => {
  try {
    const books = await Book.find().lean();
    return res.json({ success: true, books: books.map((b) => ({ ...b, id: b.id })) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch books', error: err.message });
  }
});

// POST /api/books - Create a book with initial copies
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const bookId = data.id || `book-${Date.now()}`;
    const initialCopiesCount = Number(data.totalCopies) || 1;

    // Generate physical copies if not supplied
    let copies = data.copies || [];
    if (!copies || copies.length === 0) {
      copies = Array.from({ length: initialCopiesCount }, (_, i) => {
        const copyNum = i + 1;
        const padNum = String(copyNum).padStart(3, '0');
        const randomHex = Math.floor(1000 + Math.random() * 9000);
        const randomBarcode = Math.floor(100000 + Math.random() * 900000);
        return {
          id: `copy-${Date.now()}-${padNum}`,
          bookId,
          accessionNo: `ACC-${new Date().getFullYear()}-${padNum}-${randomHex}`,
          barcode: `BC-${randomBarcode}`,
          qrCode: `QR-${bookId}-${padNum}`,
          rackNumber: data.rackNumber || 'R01',
          shelfNumber: data.shelfNumber || 'R01-S01',
          status: 'AVAILABLE',
          condition: 'NEW',
          addedDate: new Date().toISOString().split('T')[0],
          isReferenceOnly: data.isReferenceOnly || false,
        };
      });
    }

    const newBook = new Book({
      ...data,
      id: bookId,
      totalCopies: copies.length,
      availableCopies: copies.filter((c: any) => c.status === 'AVAILABLE').length,
      copies,
    });

    await newBook.save();
    return res.status(201).json({ success: true, book: newBook });
  } catch (err: any) {
    console.error('Error creating book:', err);
    return res.status(500).json({ success: false, message: 'Failed to create book', error: err.message });
  }
});

// PUT /api/books/:id - Update book
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const book = await Book.findOne({ id });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    Object.assign(book, update);
    if (book.copies) {
      book.totalCopies = book.copies.length;
      book.availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
    }

    await book.save();
    return res.json({ success: true, book });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update book', error: err.message });
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await Book.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    return res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete book', error: err.message });
  }
});

// POST /api/books/:id/copies - Add copies
router.post('/:id/copies', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { count = 1, rackNumber, shelfNumber, condition = 'NEW', isReferenceOnly = false } = req.body;

    const book = await Book.findOne({ id });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const newCopies = Array.from({ length: Number(count) }, (_, i) => {
      const copyNum = (book.copies?.length || 0) + i + 1;
      const padNum = String(copyNum).padStart(3, '0');
      const randomHex = Math.floor(1000 + Math.random() * 9000);
      const randomBarcode = Math.floor(100000 + Math.random() * 900000);
      return {
        id: `copy-${Date.now()}-${padNum}`,
        bookId: id,
        accessionNo: `ACC-${new Date().getFullYear()}-${padNum}-${randomHex}`,
        barcode: `BC-${randomBarcode}`,
        qrCode: `QR-${id}-${padNum}`,
        rackNumber: rackNumber || book.rackNumber || 'R01',
        shelfNumber: shelfNumber || book.shelfNumber || 'R01-S01',
        status: 'AVAILABLE' as const,
        condition: condition as any,
        addedDate: new Date().toISOString().split('T')[0],
        isReferenceOnly,
      };
    });

    book.copies.push(...newCopies);
    book.totalCopies = book.copies.length;
    book.availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;

    await book.save();
    return res.json({ success: true, book, newCopies });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to add copies', error: err.message });
  }
});

// PUT /api/books/:id/copies/:copyId - Update copy status/condition/shelf
router.put('/:id/copies/:copyId', async (req: Request, res: Response) => {
  try {
    const { id, copyId } = req.params;
    const { status, condition, rackNumber, shelfNumber, isReferenceOnly } = req.body;

    const book = await Book.findOne({ id });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const copy = book.copies.find((c) => c.id === copyId);
    if (!copy) {
      return res.status(404).json({ success: false, message: 'Copy not found' });
    }

    if (status !== undefined) copy.status = status;
    if (condition !== undefined) copy.condition = condition;
    if (rackNumber !== undefined) copy.rackNumber = rackNumber;
    if (shelfNumber !== undefined) copy.shelfNumber = shelfNumber;
    if (isReferenceOnly !== undefined) copy.isReferenceOnly = isReferenceOnly;

    book.availableCopies = book.copies.filter((c) => c.status === 'AVAILABLE').length;
    await book.save();

    return res.json({ success: true, book, copy });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update copy', error: err.message });
  }
});

// Categories Endpoints
router.get('/meta/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await Category.find().lean();
    return res.json({ success: true, categories });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/meta/categories', async (req: Request, res: Response) => {
  try {
    const cat = new Category({ ...req.body, id: req.body.id || `cat-${Date.now()}` });
    await cat.save();
    return res.status(201).json({ success: true, category: cat });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Authors Endpoints
router.get('/meta/authors', async (_req: Request, res: Response) => {
  try {
    const authors = await Author.find().lean();
    return res.json({ success: true, authors });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/meta/authors', async (req: Request, res: Response) => {
  try {
    const auth = new Author({ ...req.body, id: req.body.id || `auth-${Date.now()}` });
    await auth.save();
    return res.status(201).json({ success: true, author: auth });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Publishers Endpoints
router.get('/meta/publishers', async (_req: Request, res: Response) => {
  try {
    const publishers = await Publisher.find().lean();
    return res.json({ success: true, publishers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/meta/publishers', async (req: Request, res: Response) => {
  try {
    const pub = new Publisher({ ...req.body, id: req.body.id || `pub-${Date.now()}` });
    await pub.save();
    return res.status(201).json({ success: true, publisher: pub });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
