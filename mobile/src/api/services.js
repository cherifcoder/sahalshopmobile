import { api, shareInvoice } from "./client";

export const authApi = {
  login: (username, password) => api.post("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/password", data),
};

export const metaApi = {
  get: () => api.get("/meta"),
};

export const dashboardApi = {
  get: (params) => api.get("/dashboard", params),
  quick: () => api.get("/dashboard/quick"),
};

export const articleApi = {
  list: (params) => api.get("/articles", params),
  categories: () => api.get("/articles/categories"),
  get: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post("/articles", data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  remove: (id) => api.delete(`/articles/${id}`),
  adjustStock: (id, data) => api.post(`/articles/${id}/stock`, data),
};

export const saleApi = {
  list: (params) => api.get("/sales", params),
  get: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post("/sales", data),
  cancel: (id, reason) => api.post(`/sales/${id}/cancel`, { reason }),
  invoice: (sale) => shareInvoice(sale),
};

export const customerApi = {
  list: (params) => api.get("/customers", params),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  remove: (id) => api.delete(`/customers/${id}`),
  pay: (id, data) => api.post(`/customers/${id}/payments`, data),
  ledger: (id) => api.get(`/customers/${id}/ledger`),
};

export const expenseApi = {
  list: (params) => api.get("/expenses", params),
  categories: () => api.get("/expenses/categories"),
  create: (data) => api.post("/expenses", data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
};

export const lossApi = {
  list: (params) => api.get("/losses", params),
  create: (data) => api.post("/losses", data),
};

export const userApi = {
  list: (params) => api.get("/users", params),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

export { ApiError } from "./client";
