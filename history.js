const groupedHistoryDiv = document.getElementById('grouped-history');
const addGroupForm = document.getElementById('add-group-form');
const groupLength = document.getElementById('group-length');
const groupStartDate = document.getElementById('group-start-date');
const groupEndDate = document.getElementById('group-end-date');
const groupPeriodsList = document.getElementById('group-periods');
const searchDate = document.getElementById('search-date');
const searchDescription = document.getElementById('search-description');
const searchButton = document.getElementById('search-button');

const editFormContainer = document.getElementById('edit-form-container');

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let groupPeriods = [];
let editIndex = null;

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function renderGroupedTransactions(groups) {
    groupedHistoryDiv.innerHTML = '';

    if (groups.length === 0) {
        groupedHistoryDiv.innerHTML = '<p>No transactions found for the selected periods.</p>';
        return;
    }

    groups.forEach(group => {
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${group.transactions.map(transaction => `
                    <tr>
                        <td>${transaction.date}</td>
                        <td>${transaction.description}</td>
                        <td>$${transaction.amount}</td>
                        <td>${transaction.type}</td>
                        <td>${transaction.category}</td>
                        <td>
                            <button onclick="editTransaction(${transactions.indexOf(transaction)})">Edit</button>
                            <button onclick="deleteTransaction(${transactions.indexOf(transaction)})">Delete</button>
                        </td>
                    </tr>
                `).join('')}
                <tr class="totals-row">
                    <td colspan="2"><strong>Totals</strong></td>
                    <td>$${group.totalIncome - group.totalExpenses} (Saved)</td>
                    <td>Income: $${group.totalIncome}</td>
                    <td>Expenses: $${group.totalExpenses}</td>
                    <td></td>
                </tr>
            </tbody>
        `;
        groupedHistoryDiv.appendChild(table);
    });
}

function calculateGroupTotals(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totalIncome += transaction.amount;
        } else {
            totalExpenses += transaction.amount;
        }
    });

    return { totalIncome, totalExpenses };
}

function groupTransactions() {
    const groups = [];

    groupPeriods.forEach(period => {
        const { startDate, endDate, type } = period;

        const transactionsInPeriod = transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
        });

        if (transactionsInPeriod.length === 0) {
            return; // Skip empty periods
        }

        const groupDuration = type === 'weekly' ? 7 : type === 'bi-weekly' ? 14 : 30;

        let currentGroup = [];
        let currentStartDate = new Date(startDate);
        let currentEndDate = new Date(currentStartDate);
        currentEndDate.setDate(currentStartDate.getDate() + (groupDuration - 1));

        transactionsInPeriod.forEach(transaction => {
            const transactionDate = new Date(transaction.date);

            if (transactionDate >= currentStartDate && transactionDate <= currentEndDate) {
                currentGroup.push(transaction);
            } else {
                if (currentGroup.length > 0) {
                    const totals = calculateGroupTotals(currentGroup);
                    groups.push({
                        startDate: currentStartDate.toISOString().split('T')[0],
                        endDate: currentEndDate.toISOString().split('T')[0],
                        transactions: currentGroup,
                        ...totals
                    });
                }

                currentGroup = [transaction];
                currentStartDate = new Date(currentEndDate);
                currentStartDate.setDate(currentStartDate.getDate() + 1);
                currentEndDate = new Date(currentStartDate);
                currentEndDate.setDate(currentStartDate.getDate() + (groupDuration - 1));
            }
        });

        if (currentGroup.length > 0) {
            const totals = calculateGroupTotals(currentGroup);
            groups.push({
                startDate: currentStartDate.toISOString().split('T')[0],
                endDate: currentEndDate.toISOString().split('T')[0],
                transactions: currentGroup,
                ...totals
            });
        }
    });

    renderGroupedTransactions(groups);
}

function editTransaction(index) {
    const transaction = transactions[index];
    editIndex = index;

    const transactionRow = document.querySelector(`table tbody tr:nth-child(${transactions.indexOf(transaction) + 1})`);
    const rowRect = transactionRow.getBoundingClientRect();
    const formTop = rowRect.bottom + window.scrollY;
    const formLeft = rowRect.left + window.scrollX;

    editFormContainer.style.top = `${formTop}px`;
    editFormContainer.style.left = `${formLeft}px`;
    editFormContainer.style.display = 'block';

    editFormContainer.innerHTML = `
        <form id="edit-form">
            <h3>Edit Transaction</h3>
            <input type="text" id="edit-description" value="${transaction.description}" required>
            <input type="number" id="edit-amount" value="${transaction.amount}" required>
            <input type="date" id="edit-date" value="${transaction.date}" required>
            <select id="edit-category">
                <option value="Food" ${transaction.category === 'Food' ? 'selected' : ''}>Food</option>
                <option value="Rent" ${transaction.category === 'Rent' ? 'selected' : ''}>Rent</option>
                <option value="Entertainment" ${transaction.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
                <option value="Other" ${transaction.category === 'Other' ? 'selected' : ''}>Other</option>
            </select>
            <div>
                <label>
                    <input type="radio" name="edit-type" value="income" ${transaction.type === 'income' ? 'checked' : ''}> Income
                </label>
                <label>
                    <input type="radio" name="edit-type" value="expense" ${transaction.type === 'expense' ? 'checked' : ''}> Expense
                </label>
            </div>
            <button type="submit">Save</button>
            <button type="button" onclick="cancelEdit()">Cancel</button>
        </form>
    `;

    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const updatedTransaction = {
            description: document.getElementById('edit-description').value,
            amount: +document.getElementById('edit-amount').value,
            date: document.getElementById('edit-date').value,
            category: document.getElementById('edit-category').value,
            type: document.querySelector('input[name="edit-type"]:checked').value
        };

        transactions[editIndex] = updatedTransaction;
        updateLocalStorage();
        cancelEdit();
        groupTransactions();
    });
}

function cancelEdit() {
    editFormContainer.style.display = 'none';
    editIndex = null;
}

function deleteTransaction(index) {
    transactions.splice(index, 1);
    updateLocalStorage();
    groupTransactions();
}

function addGroupPeriod() {
    const startDate = groupStartDate.value;
    const endDate = groupEndDate.value;
    const type = groupLength.value;

    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
        alert('Please provide valid start and end dates.');
        return;
    }

    groupPeriods.push({ type, startDate, endDate });
    renderGroupPeriods();
    groupTransactions();
}

function renderGroupPeriods() {
    groupPeriodsList.innerHTML = '';
    groupPeriods.forEach((period, index) => {
        const li = document.createElement('li');
        li.textContent = `From ${period.startDate} to ${period.endDate} (${period.type})`;
        li.innerHTML += ` <button onclick="removeGroupPeriod(${index})">Remove</button>`;
        groupPeriodsList.appendChild(li);
    });
}

function removeGroupPeriod(index) {
    groupPeriods.splice(index, 1);
    renderGroupPeriods();
    groupTransactions();
}

searchButton.addEventListener('click', () => {
    const date = searchDate.value;
    const description = searchDescription.value.toLowerCase();

    const filtered = transactions.filter(transaction => {
        return (!date || transaction.date === date) &&
               (!description || transaction.description.toLowerCase().includes(description));
    });

    renderGroupedTransactions([{ transactions: filtered, ...calculateGroupTotals(filtered) }]);
});

document.getElementById('add-group-button').addEventListener('click', addGroupPeriod);
addGroupForm.addEventListener('submit', (e) => e.preventDefault());
