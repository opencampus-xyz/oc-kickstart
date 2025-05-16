import db from "./db.js";

export const asyncWrapper = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const queryWithPagination = async (
  queryStr,
  { pageSize, page },
  args
) => {
  let paginatedQueryStr = queryStr;
  if (pageSize && page) {
    paginatedQueryStr = `${queryStr} LIMIT ${pageSize} OFFSET ${
      pageSize * page
    }`;
  }
  const queryResult = await db.query(paginatedQueryStr, args);
  return {
    result: queryResult.rows,
    total: queryResult?.rows?.[0]?.total ?? 0,
  };
};
