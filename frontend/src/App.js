import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainSelection from "./components/MainSelection";
import ItemSensing from "./components/ItemSensing";
import MoodSensing from "./components/MoodSensing";
import DBTest from "./components/DBTest";
import MoodKeywordTest from "./components/MoodKeywordTest";
import Navigation from "./components/Navigation";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainSelection />} />
          <Route path="/item-sensing" element={<ItemSensing />} />
          <Route path="/mood-sensing" element={<MoodSensing />} />
          <Route path="/db-test" element={<DBTest />} />
          <Route path="/mood-keyword-test" element={<MoodKeywordTest />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
