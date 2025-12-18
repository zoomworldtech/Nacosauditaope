const storageKey = 'nacos-finance-v1';
const classes = ['ND1', 'ND2', 'HND1', 'HND2'];
const paymentRules = {
  ND1: { perStudent: 8000, restricted: 2000, spendable: 6000 },
  ND2: { perStudent: 1500, restricted: 1500, spendable: 0 },
  HND1: { perStudent: 8000, restricted: 2000, spendable: 6000 },
  HND2: { perStudent: 1500, restricted: 1500, spendable: 0 }
};

const defaultData = {
  totals: { ND1: 120, ND2: 110, HND1: 90, HND2: 80 },
  paid: { ND1: 0, ND2: 0, HND1: 0, HND2: 0 },
  balances: {
    totalCollected: 0,
    restricted: 0,
    spendable: 0,
    tempAdvances: 0
  },
  payments: [],
  expenses: [],
  advances: [],
  receivables: [],
  payables: [],
  logs: [],
  sessionOpen: true,
  users: [
    { name: 'Admin', role: 'Admin' },
    { name: 'Treasurer', role: 'Treasurer' },
    { name: 'President', role: 'President' },
    { name: 'General Secretary', role: 'General Secretary' }
  ]
};

const appState = loadState();

const els = {
  summaryGrid: document.getElementById('summaryGrid'),
  progressTableBody: document.querySelector('#progressTable tbody'),
  roleSelect: document.getElementById('roleSelect'),
  sessionStatus: document.getElementById('sessionStatus'),
  totalsInputs: {
    ND1: document.getElementById('nd1Total'),
    ND2: document.getElementById('nd2Total'),
    HND1: document.getElementById('hnd1Total'),
    HND2: document.getElementById('hnd2Total')
  },
  saveTotals: document.getElementById('saveTotals'),
  userName: document.getElementById('userName'),
  userRole: document.getElementById('userRole'),
  addUser: document.getElementById('addUser'),
  userList: document.getElementById('userList'),
  openSession: document.getElementById('openSession'),
  closeSession: document.getElementById('closeSession'),
  paymentClass: document.getElementById('paymentClass'),
  studentCount: document.getElementById('studentCount'),
  paymentPreview: document.getElementById('paymentPreview'),
  addPayment: document.getElementById('addPayment'),
  expenseCategory: document.getElementById('expenseCategory'),
  expenseAmount: document.getElementById('expenseAmount'),
  addExpense: document.getElementById('addExpense'),
  advanceAmount: document.getElementById('advanceAmount'),
  repaymentAmount: document.getElementById('repaymentAmount'),
  takeAdvance: document.getElementById('takeAdvance'),
  repayAdvance: document.getElementById('repayAdvance'),
  receivableDesc: document.getElementById('receivableDesc'),
  receivableAmount: document.getElementById('receivableAmount'),
  addReceivable: document.getElementById('addReceivable'),
  payableDesc: document.getElementById('payableDesc'),
  payableAmount: document.getElementById('payableAmount'),
  addPayable: document.getElementById('addPayable'),
  historyList: document.getElementById('historyList'),
  logTemplate: document.getElementById('logTemplate'),
  exportPayments: document.getElementById('exportPayments'),
  exportExpenses: document.getElementById('exportExpenses'),
  exportAdvances: document.getElementById('exportAdvances'),
  exportAudit: document.getElementById('exportAudit'),
  adminPanel: document.getElementById('adminPanel'),
  paymentsPanel: document.getElementById('paymentsPanel'),
  expensePanel: document.getElementById('expensePanel'),
  advancePanel: document.getElementById('advancePanel'),
  receivablePanel: document.getElementById('receivablePanel'),
  resetData: document.getElementById('resetData')
};

function loadState() {
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error('Bad state, resetting', e); }
  }
  return structuredClone(defaultData);
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(appState));
}

function addLog(action, description, amount = 0) {
  const entry = {
    id: crypto.randomUUID(),
    action,
    description,
    amount,
    role: els.roleSelect.value,
    timestamp: new Date().toISOString()
  };
  appState.logs.unshift(entry);
  saveState();
  renderHistory();
}

function formatCurrency(value) {
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function renderSummary() {
  const { totalCollected, restricted, spendable, tempAdvances } = appState.balances;
  const receivableTotal = appState.receivables.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const payableTotal = appState.payables.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const available = spendable - payableTotal;

  const cards = [
    { label: 'Total collected', value: formatCurrency(totalCollected), pill: 'All funds' },
    { label: 'Restricted balance (main dues)', value: formatCurrency(restricted), pill: 'No direct spend' },
    { label: 'Spendable balance', value: formatCurrency(spendable), pill: 'Operations' },
    { label: 'Temporary advances outstanding', value: formatCurrency(appState.balances.tempAdvances), pill: 'To be restored' },
    { label: 'Receivables (expected)', value: formatCurrency(receivableTotal), pill: 'Not cash yet' },
    { label: 'Payables (outstanding)', value: formatCurrency(payableTotal), pill: 'To suppliers' },
    { label: 'Available (spendable - payables)', value: formatCurrency(available), pill: 'Spendable net' }
  ];

  els.summaryGrid.innerHTML = cards.map(card => `
    <div class="summary-card">
      <div class="label">${card.label}</div>
      <div class="value">${card.value}</div>
      <div class="pill">${card.pill}</div>
    </div>`).join('');
}

function renderProgressTable() {
  els.progressTableBody.innerHTML = classes.map(cls => {
    const total = Number(appState.totals[cls] || 0);
    const paid = Number(appState.paid[cls] || 0);
    const remaining = Math.max(total - paid, 0);
    const progress = total === 0 ? 0 : Math.round((paid / total) * 100);
    return `
      <tr>
        <td>${cls}</td>
        <td>${total}</td>
        <td>${paid}</td>
        <td>${remaining}</td>
        <td>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <small class="muted">${progress}%</small>
        </td>
      </tr>`;
  }).join('');
}

function renderTotalsForm() {
  classes.forEach(cls => {
    els.totalsInputs[cls].value = appState.totals[cls];
  });
}

function renderUsers() {
  els.userList.innerHTML = appState.users.map(u => `<span class="pill">${u.name} – ${u.role}</span>`).join('');
}

function renderHistory() {
  const fragment = document.createDocumentFragment();
  appState.logs.forEach(log => {
    const clone = els.logTemplate.content.cloneNode(true);
    clone.querySelector('.log-title').textContent = log.action;
    clone.querySelector('.log-description').textContent = log.description;
    clone.querySelector('.log-meta').textContent = `${new Date(log.timestamp).toLocaleString()} • ${log.role} • ${formatCurrency(log.amount)}`;
    fragment.appendChild(clone);
  });
  els.historyList.innerHTML = '';
  els.historyList.appendChild(fragment);
}

function updateSessionStatus() {
  const open = appState.sessionOpen;
  els.sessionStatus.textContent = open ? 'Session: Open' : 'Session: Closed';
  els.sessionStatus.style.color = open ? '#22c55e' : '#f43f5e';
}

function updatePaymentPreview() {
  const cls = els.paymentClass.value;
  const count = Number(els.studentCount.value || 0);
  const rules = paymentRules[cls];
  const total = count * rules.perStudent;
  const restricted = count * rules.restricted;
  const spendable = count * rules.spendable;
  els.paymentPreview.innerHTML = `
    <div>Per-student rule: ${formatCurrency(rules.perStudent)} (${formatCurrency(rules.restricted)} restricted, ${formatCurrency(rules.spendable)} spendable)</div>
    <div><strong>Batch total:</strong> ${formatCurrency(total)}</div>
    <div>Restricted: ${formatCurrency(restricted)} | Spendable: ${formatCurrency(spendable)}</div>`;
}

function enforceRolePermissions() {
  const role = els.roleSelect.value;
  const isAdmin = role === 'Admin';
  const financeRoles = ['Treasurer', 'President', 'Admin'];
  const canEditFinance = financeRoles.includes(role);
  const readOnly = role === 'General Secretary';

  els.adminPanel.style.display = isAdmin ? 'block' : 'none';
  els.paymentsPanel.style.display = canEditFinance ? 'block' : 'none';
  els.expensePanel.style.display = canEditFinance ? 'block' : 'none';
  els.advancePanel.style.display = canEditFinance ? 'block' : 'none';
  els.receivablePanel.style.display = canEditFinance ? 'block' : 'block';

  // Disable editing when session is closed
  const disabled = !appState.sessionOpen || readOnly;
  [els.addPayment, els.addExpense, els.takeAdvance, els.repayAdvance, els.addReceivable, els.addPayable].forEach(btn => btn.disabled = disabled);
  [els.paymentClass, els.studentCount, els.expenseCategory, els.expenseAmount, els.advanceAmount, els.repaymentAmount, els.receivableAmount, els.receivableDesc, els.payableAmount, els.payableDesc].forEach(input => input.disabled = disabled);
}

function saveTotals() {
  const newTotals = {};
  for (const cls of classes) {
    const value = Number(els.totalsInputs[cls].value || 0);
    if (value < appState.paid[cls]) {
      alert(`${cls} total cannot be below paid count (${appState.paid[cls]}).`);
      return;
    }
    newTotals[cls] = value;
  }
  appState.totals = newTotals;
  saveState();
  renderProgressTable();
  addLog('Totals updated', 'Admin changed class sizes');
}

function addUser() {
  const name = els.userName.value.trim();
  const role = els.userRole.value;
  if (!name) return;
  appState.users.push({ name, role });
  els.userName.value = '';
  saveState();
  renderUsers();
  addLog('User added', `${name} added as ${role}`);
}

function toggleSession(open) {
  appState.sessionOpen = open;
  saveState();
  updateSessionStatus();
  enforceRolePermissions();
  addLog('Session ' + (open ? 'opened' : 'closed'), 'Financial session status changed');
}

function addPayment() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const cls = els.paymentClass.value;
  const count = Number(els.studentCount.value || 0);
  if (count <= 0) return alert('Enter student count.');

  const remaining = appState.totals[cls] - appState.paid[cls];
  if (count > remaining) return alert(`Only ${remaining} students remaining for ${cls}.`);

  const rules = paymentRules[cls];
  const total = count * rules.perStudent;
  const restrictedPortion = count * rules.restricted;
  const spendablePortion = count * rules.spendable;

  appState.paid[cls] += count;
  appState.balances.totalCollected += total;
  appState.balances.restricted += restrictedPortion;
  appState.balances.spendable += spendablePortion;

  if (appState.balances.tempAdvances > 0 && restrictedPortion > 0) {
    const recovered = Math.min(appState.balances.tempAdvances, restrictedPortion);
    appState.balances.tempAdvances -= recovered;
  }

  appState.payments.unshift({
    cls,
    count,
    total,
    restrictedPortion,
    spendablePortion,
    date: new Date().toISOString(),
    role: els.roleSelect.value
  });

  saveState();
  renderSummary();
  renderProgressTable();
  addLog('Payment added', `${count} ${cls} students paid. Restricted ${formatCurrency(restrictedPortion)}, Spendable ${formatCurrency(spendablePortion)}.`, total);
  updatePaymentPreview();
}

function addExpense() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const amount = Number(els.expenseAmount.value || 0);
  if (amount <= 0) return alert('Enter amount.');
  const category = els.expenseCategory.value;

  let spendableUsed = Math.min(amount, appState.balances.spendable);
  appState.balances.spendable -= spendableUsed;

  let advanced = 0;
  if (spendableUsed < amount) {
    advanced = amount - spendableUsed;
    appState.balances.restricted -= advanced;
    appState.balances.tempAdvances += advanced;
    appState.advances.unshift({ amount: advanced, date: new Date().toISOString(), note: `Auto advance for ${category}`, role: els.roleSelect.value });
  }

  appState.expenses.unshift({ category, amount, spendableUsed, advanced, date: new Date().toISOString(), role: els.roleSelect.value });
  saveState();
  renderSummary();
  addLog('Expense added', `${category} recorded. Spendable used ${formatCurrency(spendableUsed)}${advanced ? `, Temporary advance ${formatCurrency(advanced)}` : ''}.`, amount);
}

function takeAdvance() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const amount = Number(els.advanceAmount.value || 0);
  if (amount <= 0) return;
  appState.balances.restricted -= amount;
  appState.balances.spendable += amount;
  appState.balances.tempAdvances += amount;
  appState.advances.unshift({ amount, date: new Date().toISOString(), note: 'Manual advance to spendable', role: els.roleSelect.value });
  saveState();
  renderSummary();
  addLog('Advance taken', `Temporary advance of ${formatCurrency(amount)} moved to spendable.`, amount);
}

function repayAdvance() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const amount = Number(els.repaymentAmount.value || 0);
  if (amount <= 0) return;
  const useAmount = Math.min(amount, appState.balances.spendable);
  appState.balances.spendable -= useAmount;
  appState.balances.restricted += useAmount;
  appState.balances.tempAdvances = Math.max(appState.balances.tempAdvances - useAmount, 0);
  saveState();
  renderSummary();
  addLog('Advance repaid', `${formatCurrency(useAmount)} returned to restricted from spendable.`, useAmount);
}

function addReceivable() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const desc = els.receivableDesc.value.trim();
  const amount = Number(els.receivableAmount.value || 0);
  if (!desc || amount <= 0) return;
  appState.receivables.unshift({ desc, amount, date: new Date().toISOString(), role: els.roleSelect.value });
  els.receivableDesc.value = '';
  els.receivableAmount.value = '';
  saveState();
  renderSummary();
  addLog('Receivable added', `${desc} (${formatCurrency(amount)})`, amount);
}

function addPayable() {
  if (!appState.sessionOpen) return alert('Session is closed.');
  const desc = els.payableDesc.value.trim();
  const amount = Number(els.payableAmount.value || 0);
  if (!desc || amount <= 0) return;
  appState.payables.unshift({ desc, amount, date: new Date().toISOString(), role: els.roleSelect.value });
  els.payableDesc.value = '';
  els.payableAmount.value = '';
  saveState();
  renderSummary();
  addLog('Payable added', `${desc} (${formatCurrency(amount)})`, amount);
}

function exportCSV(filename, rows) {
  const csvContent = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function exportPaymentSummary() {
  const rows = [['Date', 'Class', 'Students', 'Total', 'Restricted', 'Spendable', 'User']];
  appState.payments.forEach(p => {
    rows.push([
      new Date(p.date).toLocaleString(),
      p.cls,
      p.count,
      formatCurrency(p.total),
      formatCurrency(p.restrictedPortion),
      formatCurrency(p.spendablePortion),
      p.role
    ]);
  });
  exportCSV('payment-summary', rows);
}

function exportExpenses() {
  const rows = [['Date', 'Category', 'Amount', 'Spendable used', 'Temp advance', 'User']];
  appState.expenses.forEach(e => {
    rows.push([
      new Date(e.date).toLocaleString(),
      e.category,
      formatCurrency(e.amount),
      formatCurrency(e.spendableUsed),
      formatCurrency(e.advanced),
      e.role
    ]);
  });
  exportCSV('expense-report', rows);
}

function exportAdvances() {
  const rows = [['Date', 'Amount', 'Note', 'User']];
  appState.advances.forEach(a => rows.push([new Date(a.date).toLocaleString(), formatCurrency(a.amount), a.note, a.role]));
  exportCSV('advance-report', rows);
}

function exportAudit() {
  const rows = [['Date', 'Action', 'Description', 'Amount', 'Role']];
  appState.logs.forEach(log => rows.push([new Date(log.timestamp).toLocaleString(), log.action, log.description, formatCurrency(log.amount), log.role]));
  exportCSV('audit-log', rows);
}

function resetData() {
  Object.assign(appState, structuredClone(defaultData));
  saveState();
  boot();
  addLog('Data reset', 'Demo data restored');
}

function boot() {
  renderSummary();
  renderProgressTable();
  renderTotalsForm();
  renderUsers();
  renderHistory();
  updatePaymentPreview();
  updateSessionStatus();
  enforceRolePermissions();
}

// Event listeners
els.roleSelect.addEventListener('change', () => enforceRolePermissions());
els.paymentClass.addEventListener('change', updatePaymentPreview);
els.studentCount.addEventListener('input', updatePaymentPreview);
els.saveTotals.addEventListener('click', saveTotals);
els.addUser.addEventListener('click', addUser);
els.openSession.addEventListener('click', () => toggleSession(true));
els.closeSession.addEventListener('click', () => toggleSession(false));
els.addPayment.addEventListener('click', addPayment);
els.addExpense.addEventListener('click', addExpense);
els.takeAdvance.addEventListener('click', takeAdvance);
els.repayAdvance.addEventListener('click', repayAdvance);
els.addReceivable.addEventListener('click', addReceivable);
els.addPayable.addEventListener('click', addPayable);
els.exportPayments.addEventListener('click', exportPaymentSummary);
els.exportExpenses.addEventListener('click', exportExpenses);
els.exportAdvances.addEventListener('click', exportAdvances);
els.exportAudit.addEventListener('click', exportAudit);
els.resetData.addEventListener('click', resetData);

boot();
