import apiClient from "./apiClient.js";

/**
 * Service encapsulating the main v1 backend endpoints.
 */

export async function getCurrentUser() {
  const response = await apiClient.get("/v1/current_user");
  return response.data;
}

export async function createOrganization({ name, slug }) {
  const payload = { name };
  if (slug) {
    payload.slug = slug;
  }
  
  const response = await apiClient.post("/v1/organizations", payload);
  return response.data;
}

export async function getOrganizationScopes() {
  const response = await apiClient.get("/v1/organization/scopes");
  return response.data;
}

export async function updateOrganizationProfile(payload) {
  const response = await apiClient.patch("/v1/organization", payload);
  return response.data;
}

export async function getOrganizationSettings() {
  const response = await apiClient.get("/v1/organization/settings");
  return response.data;
}

export async function updateOrganizationSettings(payload) {
  const response = await apiClient.patch("/v1/organization/settings", payload);
  return response.data;
}

export async function deleteOrganization() {
  const response = await apiClient.post("/v1/organization/soft-delete");
  return response.data;
}

export async function getOrganizationMembers() {
  const response = await apiClient.get("/v1/organization/members");
  return response.data;
}

export async function inviteOrganizationMember(payload) {
  const response = await apiClient.post("/v1/organization/members", payload);
  return response.data;
}

export async function updateOrganizationMember(membershipId, payload) {
  const response = await apiClient.patch(`/v1/organization/members/${membershipId}`, payload);
  return response.data;
}

// --- Stock Management ---

export async function getStockItems(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/stock/items?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function getLaserPaperStocks(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/stock/items/laser-paper?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}



export async function createStockItem(payload) {
  const response = await apiClient.post("/v1/stock/items", payload);
  return response.data;
}

export async function updateStockItem(stockItemId, payload) {
  const response = await apiClient.patch(`/v1/stock/items/${stockItemId}`, payload);
  return response.data;
}

export async function getStockPricingRule(stockItemId) {
  const response = await apiClient.get(`/v1/stock/items/${stockItemId}/pricing-rule`);
  return response.data;
}

export async function upsertStockPricingRule(stockItemId, payload) {
  const response = await apiClient.put(`/v1/stock/items/${stockItemId}/pricing-rule`, payload);
  return response.data;
}

export async function addStockQuantity(stockItemId, amount) {
  const response = await apiClient.post(`/v1/stock/items/${stockItemId}/quantity/add`, { amount });
  return response.data;
}

export async function clearStockQuantity(stockItemId) {
  const response = await apiClient.post(`/v1/stock/items/${stockItemId}/quantity/clear`);
  return response.data;
}

export async function deleteStockItem(stockItemId) {
  const response = await apiClient.delete(`/v1/stock/items/${stockItemId}`);
  return response.data;
}

// --- Printer Management ---

export async function getPrinterModels(searchQuery = "", page = 1, limit = 10) {
  let url = `/v1/printer-models?page=${page}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function createPrinterModel(payload) {
  const response = await apiClient.post("/v1/printer-models", payload);
  return response.data;
}

export async function updatePrinterModel(printerId, payload) {
  const response = await apiClient.patch(`/v1/printer-models/${printerId}`, payload);
  return response.data;
}

export async function deletePrinterModel(printerId) {
  const response = await apiClient.delete(`/v1/printer-models/${printerId}`);
  return response.data;
}

// --- Customer Management ---

export async function getCustomers(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/customers?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function getCustomer(customerId) {
  const response = await apiClient.get(`/v1/customers/${customerId}`);
  return response.data;
}

export async function createCustomer(payload) {
  const response = await apiClient.post("/v1/customers", payload);
  return response.data;
}

export async function updateCustomer(customerId, payload) {
  const response = await apiClient.patch(`/v1/customers/${customerId}`, payload);
  return response.data;
}

export async function deleteCustomer(customerId) {
  const response = await apiClient.delete(`/v1/customers/${customerId}`);
  return response.data;
}

// --- Quotation Management ---

export async function getQuotations(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/quotations?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function getQuotation(quotationId) {
  const response = await apiClient.get(`/v1/quotations/${quotationId}`);
  return response.data;
}

export async function createQuotation(payload) {
  const response = await apiClient.post("/v1/quotations", payload);
  return response.data;
}

export async function updateQuotation(quotationId, payload) {
  const response = await apiClient.patch(`/v1/quotations/${quotationId}`, payload);
  return response.data;
}
export async function deleteQuotation(quotationId) {
  const response = await apiClient.delete(`/v1/quotations/${quotationId}`);
  return response.data;
}

// --- Size Chart Management ---


export async function getSizeCharts(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/size-charts?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function getSizeChart(sizeChartId) {
  const response = await apiClient.get(`/v1/size-charts/${sizeChartId}`);
  return response.data;
}

export async function createSizeChart(payload) {
  const response = await apiClient.post("/v1/size-charts", payload);
  return response.data;
}

export async function updateSizeChart(sizeChartId, payload) {
  const response = await apiClient.patch(`/v1/size-charts/${sizeChartId}`, payload);
  return response.data;
}

export async function deleteSizeChart(sizeChartId) {
  const response = await apiClient.delete(`/v1/size-charts/${sizeChartId}`);
  return response.data;
}

export async function getLaserQuoteOptions(payload) {
  const response = await apiClient.post("/v1/quotations/laser/options", payload);
  return response.data;
}

export async function getOffsetQuoteOptions(payload) {
  const response = await apiClient.post("/v1/quotations/offset/options", payload);
  return response.data;
}

export async function getOffsetPaperStocks(searchQuery = "", offset = 0, limit = 20) {
  let url = `/v1/stock/items/offset-paper?offset=${offset}&limit=${limit}`;
  if (searchQuery) url += `&q=${encodeURIComponent(searchQuery)}`;
  const response = await apiClient.get(url);
  return response.data;
}








