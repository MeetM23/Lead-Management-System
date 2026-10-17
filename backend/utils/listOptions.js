// Sorting and pagination for list endpoints, read from the query string.
// Only whitelisted columns can be sorted on; everything else is ignored.

const SORTABLE_FIELDS = ["createdAt", "updatedAt", "name", "leadId", "priority", "source"];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// "-createdAt,name" -> [{ createdAt: "desc" }, { name: "asc" }]; defaults to newest first
const parseSort = (value) => {
  const orderBy = typeof value === "string"
    ? value.split(",").flatMap((token) => {
        const descending = token.startsWith("-");
        const field = descending ? token.slice(1) : token;
        return SORTABLE_FIELDS.includes(field) ? [{ [field]: descending ? "desc" : "asc" }] : [];
      })
    : [];
  return orderBy.length > 0 ? orderBy : [{ createdAt: "desc" }];
};

export const parseListOptions = (queryString = {}) => {
  const page = Math.max(parseInt(queryString.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryString.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return { orderBy: parseSort(queryString.sort), skip: (page - 1) * limit, take: limit };
};
