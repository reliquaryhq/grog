const getJson = (response) => response.json();

const handleError = async (response) => {
  if (response.ok) {
    return response;
  }

  const error = new Error(`${response.status} ${response.statusText}`);
  error.url = new URL(response.url);

  const body = await response.text();

  try {
    const parsedBody = JSON.parse(body);
    error.response = parsedBody;
  } catch (error) {} // eslint-disable-line

  throw error;
};

export {
  getJson,
  handleError,
};
