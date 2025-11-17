import React, { useState } from "react";
import Login from "./login.jsx";
import Signup from "./signup.jsx";

export default function App() {
  const [showLogin, setShowLogin] = useState(true);

  return (
    <div>
      <h1>Freetube Auth</h1>
      <button onClick={() => setShowLogin(!showLogin)}>
        {showLogin ? "Go to Signup" : "Go to Login"}
      </button>
      {showLogin ? <Login /> : <Signup />}
    </div>
  );
}
