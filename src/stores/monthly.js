import { defineStore } from 'pinia';
import axios from 'axios';

const API = '/api';

function getCurrentKoreaYearMonth() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

function getYearMonth(dateString) {
  return String(dateString ?? '').slice(0, 7);
}

function getLatestYearMonth(transactions) {
  const yearMonths = Array.from(
    new Set(
      (Array.isArray(transactions) ? transactions : [])
        .map((transaction) => getYearMonth(transaction.date))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return yearMonths[yearMonths.length - 1] ?? null;
}

function buildMonthlyCashflow(transactions, categories) {
  const groupedTransactions = new Map();

  (Array.isArray(transactions) ? transactions : []).forEach((transaction) => {
    const yearMonth = getYearMonth(transaction.date);

    if (!yearMonth) {
      return;
    }

    if (!groupedTransactions.has(yearMonth)) {
      groupedTransactions.set(yearMonth, []);
    }

    groupedTransactions.get(yearMonth).push(transaction);
  });

  const expenseCategories = (Array.isArray(categories) ? categories : []).filter(
    (category) => category.type === 'expense',
  );
  const currentYearMonth = getCurrentKoreaYearMonth();

  return [...groupedTransactions.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([yearMonth, monthlyTransactions]) => {
      const totalIncome = monthlyTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Number(transaction.price || 0), 0);
      const totalSpend = monthlyTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Number(transaction.price || 0), 0);
      const coveredDates = monthlyTransactions
        .map((transaction) => String(transaction.date ?? ''))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right));

      return {
        yearMonth,
        totalIncome,
        totalSpend,
        totalCashflow: totalIncome - totalSpend,
        coveredFrom: coveredDates[0] ?? `${yearMonth}-01`,
        coveredTo:
          coveredDates[coveredDates.length - 1] ?? `${yearMonth}-01`,
        isPartialMonth: yearMonth === currentYearMonth,
        spendingAnalysis: expenseCategories.map((category) => {
          const categoryTransactions = monthlyTransactions.filter(
            (transaction) =>
              transaction.type === 'expense' &&
              transaction.categoryId === category.id,
          );
          const totalAmount = categoryTransactions.reduce(
            (sum, transaction) => sum + Number(transaction.price || 0),
            0,
          );

          return {
            categoryId: category.id,
            totalAmount,
            transactionCount: categoryTransactions.length,
            percentage:
              totalSpend > 0
                ? Number(((totalAmount / totalSpend) * 100).toFixed(1))
                : 0,
          };
        }),
      };
    });
}

export const useMonthlyStore = defineStore('monthly', {
  state: () => ({
    currentMonth: '2026-04',
    budgetLimit: 5000000,
    loading: false,
    allCategories: [],
    allTransactions: [],
    allMonthlyCashflow: [],
    compareRangeLeft: null,
    compareRangeRight: null,
  }),

  getters: {
    currentMonthData: (state) =>
      state.allMonthlyCashflow.find(d => d.yearMonth === state.currentMonth) || null,

    prevMonthData: (state) => {
      const [y, m] = state.currentMonth.split('-').map(Number);
      const prev = new Date(y, m - 2);
      const prevYearMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      return state.allMonthlyCashflow.find(d => d.yearMonth === prevYearMonth) || null;
    },

    income: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      return d?.totalIncome ?? 0;
    },
    expense: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      return d?.totalSpend ?? 0;
    },
    netProfit: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      return (d?.totalIncome ?? 0) - (d?.totalSpend ?? 0);
    },
    diffIncome: (state) => {
      const cur = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      const [y, m] = state.currentMonth.split('-').map(Number);
      const prevYM = `${new Date(y, m-2).getFullYear()}-${String(new Date(y, m-2).getMonth()+1).padStart(2,'0')}`;
      const prv = state.allMonthlyCashflow.find(x => x.yearMonth === prevYM);
      return (cur?.totalIncome ?? 0) - (prv?.totalIncome ?? 0);
    },
    diffExpense: (state) => {
      const cur = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      const [y, m] = state.currentMonth.split('-').map(Number);
      const prevYM = `${new Date(y, m-2).getFullYear()}-${String(new Date(y, m-2).getMonth()+1).padStart(2,'0')}`;
      const prv = state.allMonthlyCashflow.find(x => x.yearMonth === prevYM);
      return (cur?.totalSpend ?? 0) - (prv?.totalSpend ?? 0);
    },
    diffNetProfit: (state) => {
      const cur = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      const [y, m] = state.currentMonth.split('-').map(Number);
      const prevYM = `${new Date(y, m-2).getFullYear()}-${String(new Date(y, m-2).getMonth()+1).padStart(2,'0')}`;
      const prv = state.allMonthlyCashflow.find(x => x.yearMonth === prevYM);
      return ((cur?.totalIncome ?? 0) - (cur?.totalSpend ?? 0)) - ((prv?.totalIncome ?? 0) - (prv?.totalSpend ?? 0));
    },
    usedPercentage: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      return Math.round(((d?.totalSpend ?? 0) / state.budgetLimit) * 100);
    },
    remainingBudget: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      return state.budgetLimit - (d?.totalSpend ?? 0);
    },
    budgetEmoji: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      const percent = Math.round(((d?.totalSpend ?? 0) / state.budgetLimit) * 100);
      if (percent < 60) return '🙂';
      if (percent < 80) return '😐';
      if (percent < 100) return '😟';
      return '😡';
    },
    categories: (state) => {
      const d = state.allMonthlyCashflow.find(x => x.yearMonth === state.currentMonth);
      if (!d) return [];

      const emojiMap = {
        living: '🏠',
        subscription: '📱',
        shopping: '🛍️',
        food: '🍴',
        transport: '🚌',
        medical: '💊',
        etc: '···',
      };

      return d.spendingAnalysis
        .filter(item => item.categoryId !== 'income')
        .map(item => {
          const cat = state.allCategories.find(c => c.id === item.categoryId);
          return {
            id: item.categoryId,
            name: cat?.labelKo || cat?.name || item.categoryId,
            amount: item.totalAmount,
            percentage: item.percentage,
            color: cat?.color || '#ccc',
            icon: emojiMap[item.categoryId] || '···',
          };
        });
    },

    // 비교기간 수입 계산
    compareIncome: (state) => {
      if (!state.compareRangeLeft || !state.compareRangeRight) return null;
      const leftTotal = state.allTransactions
        .filter(t => t.type === 'income' && t.date >= state.compareRangeLeft.start && t.date <= state.compareRangeLeft.end)
        .reduce((sum, t) => sum + t.price, 0);
      const rightTotal = state.allTransactions
        .filter(t => t.type === 'income' && t.date >= state.compareRangeRight.start && t.date <= state.compareRangeRight.end)
        .reduce((sum, t) => sum + t.price, 0);
      return { left: leftTotal, right: rightTotal, diff: rightTotal - leftTotal };
    },

    // 비교기간 지출 계산
    compareExpense: (state) => {
      if (!state.compareRangeLeft || !state.compareRangeRight) return null;
      const leftTotal = state.allTransactions
        .filter(t => t.type === 'expense' && t.date >= state.compareRangeLeft.start && t.date <= state.compareRangeLeft.end)
        .reduce((sum, t) => sum + t.price, 0);
      const rightTotal = state.allTransactions
        .filter(t => t.type === 'expense' && t.date >= state.compareRangeRight.start && t.date <= state.compareRangeRight.end)
        .reduce((sum, t) => sum + t.price, 0);
      return { left: leftTotal, right: rightTotal, diff: rightTotal - leftTotal };
    },
  },

  actions: {
    async fetchAll() {
      this.loading = true;

      try {
        const [cats, trans] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/transactions`),
        ]);

        this.allCategories = cats.data;
        this.allTransactions = trans.data;
        this.allMonthlyCashflow = buildMonthlyCashflow(
          this.allTransactions,
          this.allCategories,
        );

        const latestYearMonth =
          getLatestYearMonth(this.allTransactions) ??
          getCurrentKoreaYearMonth();

        if (
          !this.allMonthlyCashflow.some(
            (item) => item.yearMonth === this.currentMonth,
          )
        ) {
          this.currentMonth = latestYearMonth;
        }
      } finally {
        this.loading = false;
      }
    },
    setBudget(amount) {
      this.budgetLimit = amount;
    },
    setCompareRange(left, right) {
      this.compareRangeLeft = left;
      this.compareRangeRight = right;
    },
    nextMonth() {
      const [year, month] = this.currentMonth.split('-').map(Number);
      const date = new Date(year, month);
      this.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },
    prevMonth() {
      const [year, month] = this.currentMonth.split('-').map(Number);
      const date = new Date(year, month - 2);
      this.currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }
});
