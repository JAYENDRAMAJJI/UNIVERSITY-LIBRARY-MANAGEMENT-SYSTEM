import { libraryStore } from './libraryStore.service';
import { CopyCondition } from '../types/library';

export const circulationService = {
  getTransactions: () => libraryStore.snapshot.transactions,
  
  issueBook: (copyId: string, memberId: string, issuedByUserId?: string) => {
    return libraryStore.issueBook(copyId, memberId, issuedByUserId);
  },

  returnBook: (transactionId: string, condition?: CopyCondition, notes?: string) => {
    return libraryStore.returnBook(transactionId, condition, notes);
  },

  renewBook: (transactionId: string) => {
    return libraryStore.renewBook(transactionId);
  },
};
