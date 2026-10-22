const STORAGE_KEYS = {
  leads: 'enterprise-crm-leads',
  customers: 'enterprise-crm-customers',
  deals: 'enterprise-crm-deals'
};

const initialData = {
  leads: [
    { id: 'lead-1', name: 'Jordan Lee', email: 'jordan@northstar.io', company: 'Northstar Labs', stage: 'Qualified' },
    { id: 'lead-2', name: 'Priya Shah', email: 'priya@bluepeak.co', company: 'BluePeak', stage: 'Contacted' },
    { id: 'lead-3', name: 'Sam Rivera', email: 'sam@harborone.com', company: 'Harbor One', stage: 'New' }
  ],
  customers: [
    { id: 'customer-1', name: 'Jordan Lee', email: 'jordan@northstar.io', company: 'Northstar Labs', phone: '(415) 555-0181', status: 'Active', notes: 'Key account' },
    { id: 'customer-2', name: 'Priya Shah', email: 'priya@bluepeak.co', company: 'BluePeak', phone: '(212) 555-0176', status: 'Prospect', notes: 'Expansion opportunity' }
  ],
  deals: [
    { id: 'deal-1', name: 'Northstar Renewal', customer: 'Northstar Labs', amount: 18000, closeDate: '2026-10-22', stage: 'Proposal', owner: 'Ava' },
    { id: 'deal-2', name: 'BluePeak Expansion', customer: 'BluePeak', amount: 24500, closeDate: '2026-11-05', stage: 'Negotiation', owner: 'Leo' }
  ]
};

const state = {
  activeTab: 'leads',
  editing: {
    leads: null,
    customers: null,
    deals: null
  }
};

let messageTimer;

function notify(message, type = 'success') {
  const messageElement = document.getElementById('message');
  if (!messageElement) {
    return;
  }

  window.clearTimeout(messageTimer);
  messageElement.textContent = message;
  messageElement.className = `message visible ${type}`;
  messageTimer = window.setTimeout(() => {
    messageElement.classList.remove('visible');
  }, 4000);
}

function safeStorageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Unable to read CRM data from ${key}.`, error);
    notify('Saved data could not be read. Showing the sample records instead.', 'error');
    return fallback;
  }
}

function safeStorageWrite(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Unable to save CRM data.', error);
    notify('Unable to save changes. Check your browser storage and try again.', 'error');
    return false;
  }
}

function getData(entity) {
  return safeStorageRead(STORAGE_KEYS[entity], initialData[entity]);
}

function saveData(entity, items) {
  return safeStorageWrite(STORAGE_KEYS[entity], items);
}

function getFormElement(entity) {
  return document.querySelector(`form[data-entity="${entity}"]`);
}

function setActiveTab(tabName) {
  state.activeTab = tabName;

  const buttons = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.entity-panel');

  buttons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  panels.forEach((panel) => {
    const isActive = panel.dataset.entity === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function resetForm(entity) {
  const form = getFormElement(entity);
  if (!form) {
    return;
  }

  form.reset();
  const title = document.getElementById(`${entity.slice(0, -1)}FormTitle`);
  if (title) {
    title.textContent = entity === 'leads' ? 'Add Lead' : entity === 'customers' ? 'Add Customer' : 'Add Deal';
  }

  const cancelButton = document.getElementById(`cancel${entity.charAt(0).toUpperCase()}${entity.slice(1, -1)}Edit`);
  if (cancelButton) {
    cancelButton.classList.add('hidden');
  }

  state.editing[entity] = null;
  form.dataset.mode = 'create';
}

function populateForm(entity, item) {
  if (!item) {
    resetForm(entity);
    return;
  }

  const form = getFormElement(entity);
  if (!form) {
    return;
  }

  const fields = Object.entries(item);
  fields.forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });

  const titleMap = {
    leads: 'Edit Lead',
    customers: 'Edit Customer',
    deals: 'Edit Deal'
  };

  const title = document.getElementById(`${entity.slice(0, -1)}FormTitle`);
  if (title) {
    title.textContent = titleMap[entity] || 'Edit Record';
  }

  const buttonId = entity === 'leads' ? 'cancelLeadEdit' : entity === 'customers' ? 'cancelCustomerEdit' : 'cancelDealEdit';
  const cancelButton = document.getElementById(buttonId);
  if (cancelButton) {
    cancelButton.classList.remove('hidden');
  }

  state.editing[entity] = item.id;
  form.dataset.mode = 'edit';
}

function renderDashboard() {
  const leads = getData('leads');
  const customers = getData('customers');
  const deals = getData('deals');

  document.getElementById('totalLeads').textContent = leads.length;
  document.getElementById('customers').textContent = customers.length;
  document.getElementById('deals').textContent = deals.length;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function badgeClass(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function renderEntityTable(entity) {
  const items = getData(entity);
  const tbody = document.getElementById(`${entity.slice(0, -1)}Table`);
  const search = document.querySelector(`[data-search="${entity}"]`)?.value.trim().toLowerCase() || '';
  const filter = document.querySelector(`[data-filter="${entity}"]`)?.value || '';
  const statusField = entity === 'customers' ? 'status' : 'stage';
  const filteredItems = items.filter((item) => {
    const matchesSearch = Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(search));
    return matchesSearch && (!filter || item[statusField] === filter);
  });

  if (!tbody) {
    return;
  }

  if (!filteredItems.length) {
    const colSpan = entity === 'leads' ? 5 : entity === 'customers' ? 6 : 6;
    const message = items.length
      ? 'No records match your search or filter.'
      : `No ${entity} available. Add one to get started.`;
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${colSpan}">${message}</td></tr>`;
    return;
  }

  let rows = '';

  if (entity === 'leads') {
    rows = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.company)}</td>
            <td><span class="badge badge-${badgeClass(item.stage)}">${escapeHtml(item.stage)}</span></td>
            <td class="actions-cell">
              <button class="table-action edit" type="button" data-entity="leads" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
              <button class="table-action delete" type="button" data-entity="leads" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');
  }

  if (entity === 'customers') {
    rows = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td>${escapeHtml(item.company)}</td>
            <td>${escapeHtml(item.phone)}</td>
            <td><span class="badge badge-${badgeClass(item.status)}">${escapeHtml(item.status)}</span></td>
            <td class="actions-cell">
              <button class="table-action edit" type="button" data-entity="customers" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
              <button class="table-action delete" type="button" data-entity="customers" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');
  }

  if (entity === 'deals') {
    rows = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.customer)}</td>
            <td>${formatCurrency(item.amount)}</td>
            <td><span class="badge badge-${badgeClass(item.stage)}">${escapeHtml(item.stage)}</span></td>
            <td>${escapeHtml(item.closeDate || 'N/A')}</td>
            <td class="actions-cell">
              <button class="table-action edit" type="button" data-entity="deals" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
              <button class="table-action delete" type="button" data-entity="deals" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');
  }

  tbody.innerHTML = rows;
}

function renderAll() {
  renderDashboard();
  renderEntityTable('leads');
  renderEntityTable('customers');
  renderEntityTable('deals');
}

function generateId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function submitEntityForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const entity = form.dataset.entity;
  const entries = new FormData(form);
  const values = Object.fromEntries(entries.entries());

  const cleaned = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
  );

  const requiredFields = {
    leads: ['name', 'email', 'company', 'stage'],
    customers: ['name', 'email', 'company', 'phone', 'status'],
    deals: ['name', 'customer', 'amount', 'closeDate', 'stage']
  };

  const hasAllRequiredValues = requiredFields[entity].every((fieldName) => {
    const value = cleaned[fieldName];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });

  if (!hasAllRequiredValues) {
    alert('Please complete all required fields before saving.');
    return;
  }

  const records = getData(entity);
  const id = state.editing[entity] || generateId(entity.slice(0, -1));
  const nextRecord = {
    ...cleaned,
    id
  };
  const isEditing = Boolean(state.editing[entity]);
  const updatedRecords = isEditing
    ? records.map((record) => (record.id === state.editing[entity] ? { ...record, ...nextRecord } : record))
    : [...records, nextRecord];

  if (!saveData(entity, updatedRecords)) {
    return;
  }

  resetForm(entity);
  renderAll();
  const entityLabel = entity.slice(0, -1);
  notify(`${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)} ${isEditing ? 'updated' : 'added'} successfully.`);
}

function handleTableAction(event) {
  const target = event.target.closest('button[data-action]');
  if (!target) {
    return;
  }

  const { action, entity, id } = target.dataset;
  if (!entity || !id) {
    return;
  }

  const records = getData(entity);
  const item = records.find((record) => String(record.id) === String(id));

  if (!item) {
    return;
  }

  if (action === 'edit') {
    populateForm(entity, item);
    setActiveTab(entity);
    notify(`Editing ${entity.slice(0, -1)}. Update the form and save your changes.`);
    return;
  }

  if (action === 'delete') {
    const confirmMessage = `Are you sure you want to delete this ${entity.slice(0, -1)}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const remainingRecords = records.filter((record) => String(record.id) !== String(id));
    if (!saveData(entity, remainingRecords)) {
      return;
    }
    renderAll();
    if (state.editing[entity] === id) {
      resetForm(entity);
    }
    const entityLabel = entity.slice(0, -1);
    notify(`${entityLabel.charAt(0).toUpperCase()}${entityLabel.slice(1)} deleted.`);
  }
}

function bindTabControls() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      const nextTab = button.dataset.tab;
      if (nextTab) {
        setActiveTab(nextTab);
      }
    });
  });
}

function attachFormHandlers() {
  const forms = document.querySelectorAll('.crm-form');
  forms.forEach((form) => {
    form.addEventListener('submit', submitEntityForm);
  });

  document.getElementById('cancelLeadEdit').addEventListener('click', () => resetForm('leads'));
  document.getElementById('cancelCustomerEdit').addEventListener('click', () => resetForm('customers'));
  document.getElementById('cancelDealEdit').addEventListener('click', () => resetForm('deals'));
}

function attachSearchAndFilterHandlers() {
  document.querySelectorAll('[data-search], [data-filter]').forEach((control) => {
    control.addEventListener('input', () => renderEntityTable(control.dataset.search || control.dataset.filter));
    control.addEventListener('change', () => renderEntityTable(control.dataset.search || control.dataset.filter));
  });
}

function attachGlobalFunctions() {
  window.addLead = () => {
    const form = document.getElementById('leadForm');
    form?.requestSubmit();
  };

  window.addCustomer = () => {
    const form = document.getElementById('customerForm');
    form?.requestSubmit();
  };

  window.addDeal = () => {
    const form = document.getElementById('dealForm');
    form?.requestSubmit();
  };
}

function setup() {
  bindTabControls();
  attachFormHandlers();
  attachSearchAndFilterHandlers();
  attachGlobalFunctions();
  document.addEventListener('click', handleTableAction);
  setActiveTab('leads');
  renderAll();
}

document.addEventListener('DOMContentLoaded', setup);
