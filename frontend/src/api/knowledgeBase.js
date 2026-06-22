// frontend/src/api/knowledgeBase.js

import { apiFetch } from "./tickets.js";

export async function listArticles(page = 1) {
  return apiFetch(`/api/knowledge-base/?page=${page}`, {}, true);
}

export async function createArticle(payload) {
  return apiFetch("/api/knowledge-base/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, true);
}

export async function updateArticle(articleId, payload) {
  return apiFetch(`/api/knowledge-base/${articleId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, true);
}

export async function deleteArticle(articleId) {
  return apiFetch(`/api/knowledge-base/${articleId}/`, {
    method: "DELETE",
  }, true);
}