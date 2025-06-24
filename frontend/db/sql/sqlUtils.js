export const fetchWithAuthToken = async (url, options, authToken) => {
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${authToken}`,
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const respBody = await response.json();
    throw new Error(respBody?.error?.message || "Unknown API error");
  }

  return response;
};

export const publicFetch = async (url, options = {}) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/public${url}`,
    {
      ...options,
    }
  );

  if (!response.ok) {
    const respBody = await response.json();
    throw new Error(respBody?.error?.message || "Unknown API error");
  }

  return response;
};
