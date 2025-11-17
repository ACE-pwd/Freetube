const BASE_URL = 'https://freetube-dvts.onrender.com/';

export async function fetchUsers(token) {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function signupUser(name, email, password) {
  const res = await fetch(`${BASE_URL}signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}
