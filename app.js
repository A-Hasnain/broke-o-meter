const transactionForm = document.getElementById('transaction-form');
const expenseChartEl = document.getElementById('expense-chart');
const chartFilterForm = document.getElementById('chart-filter-form');
const filterStartDate = document.getElementById('filter-start-date');
const filterEndDate = document.getElementById('filter-end-date');
const applyFilterButton = document.getElementById('apply-filter-button');
const resetFilterButton = document.getElementById('reset-filter-button');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChart;

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function calculateTotals(filteredTransactions) {
    let totalIncome = 0, totalExpenses = 0;

    filteredTransactions.forEach(transaction => {
        if (transaction.type === 'income') totalIncome += transaction.amount;
        else totalExpenses += transaction.amount;
    });

    return { totalIncome, totalExpenses };
}

function updatePieChart(filteredTransactions) {
    const { totalIncome, totalExpenses } = calculateTotals(filteredTransactions);

    const remainingIncome = totalIncome - totalExpenses;
    const data = remainingIncome >= 0
        ? [remainingIncome, totalExpenses]
        : [Math.abs(remainingIncome), totalExpenses];

    const backgroundColors = remainingIncome >= 0
        ? ['#4caf50', '#f44336']
        : ['#ff9800', '#f44336'];

    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(expenseChartEl, {
        type: 'pie',
        data: {
            labels: remainingIncome >= 0 ? ['Remaining Income', 'Expenses'] : ['Over Budget', 'Expenses'],
            datasets: [{
                data,
                backgroundColor: backgroundColors
            }]
        },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: $${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function applyChartFilter() {
    const startDate = new Date(filterStartDate.value);
    const endDate = new Date(filterEndDate.value);

    const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return (!filterStartDate.value || transactionDate >= startDate) &&
               (!filterEndDate.value || transactionDate <= endDate);
    });

    updatePieChart(filteredTransactions);
}

function resetChartFilter() {
    filterStartDate.value = '';
    filterEndDate.value = '';
    updatePieChart(transactions);
}

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = +document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const type = document.querySelector('input[name="transaction-type"]:checked').value;

    transactions.push({ description, amount, date, category, type });
    updateLocalStorage();
    updatePieChart(transactions);
    transactionForm.reset();
});

applyFilterButton.addEventListener('click', applyChartFilter);
resetFilterButton.addEventListener('click', resetChartFilter);

updatePieChart(transactions);
