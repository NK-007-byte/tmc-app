"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Confetti from "react-confetti";

/**
 * USER_NAME: The current user's identifier.
 * Modify if you want multiple users support.
 */
const USER_NAME = "nils";

export default function Page() {
  // ----------------------------
  // State hooks
  // ----------------------------
  const [count, setCount] = useState(0);                  // Total count of salads eaten
  const [events, setEvents] = useState([]);              // All events from Supabase
  // const [inputValue, setInputValue] = useState("");      // Manual input for count
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 }); // For Confetti
  const [showConfetti, setShowConfetti] = useState(false);
  const [emojiPieces, setEmojiPieces] = useState([]);    // Falling emoji rain

  // Year selection for statistics
  const currentYear = new Date().getFullYear(); // Get the current year
  const eventYears = Array.from(new Set(events.map(e => new Date(e.created_at).getFullYear()))); // Collect years from existing events
  const totalyears = Array.from(new Set([...eventYears, currentYear])).sort((a, b) => b - a); // Combine and sort descending

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Manual monthly entry state
  const [manualYear, setManualYear] = useState(selectedYear);
  const [manualMonth, setManualMonth] = useState(new Date().getMonth());
  const [manualCount, setManualCount] = useState("");

  // ----------------------------
  // Effect: track window resize for confetti/emoji animations
  // ----------------------------
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ----------------------------
  // Load all events from Supabase
  // ----------------------------
  const loadEvents = async () => {
    const { data, error } = await supabase
      .from("tmc_events")
      .select("*")
      .eq("user_name", USER_NAME)
      .order("created_at", { ascending: true });

    if (error) console.error("Supabase load error:", error);

    if (data) {
      setEvents(data);
      setCount(data.reduce((sum, e) => sum + e.change, 0));
    }
  };

  // ----------------------------
  // Effect: Realtime subscription to Supabase table changes
  // ----------------------------
  useEffect(() => {
    loadEvents();
    const subscription = supabase
      .channel("tmc_events_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tmc_events" },
        (payload) => {
          if (payload.new.user_name === USER_NAME) {
            loadEvents();
            triggerConfetti();
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // ----------------------------
  // Input validation helper
  // ----------------------------
  const isValidInt = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;

  // ----------------------------
  // Trigger confetti + emoji rain
  // ----------------------------
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Generate falling emoji positions
    const emojis = Array.from({ length: 30 }, () => ({
      emoji: Math.random() > 0.5 ? "🍅" : "🧀",
      x: Math.random() * windowSize.width,
      y: 0,
      speed: 2 + Math.random() * 3,
    }));
    setEmojiPieces(emojis);
    setTimeout(() => setEmojiPieces([]), 2000);
  };

  // ----------------------------
  // Button click handler: increment by 1
  // ----------------------------
  const handleButtonClick = async () => {
    const change = 1;
    const { error } = await supabase.from("tmc_events").insert([{ user_name: USER_NAME, change }]);
    if (error) console.error("Insert error:", error);
    triggerConfetti();
  };

  // ----------------------------
  // Manual input change
  // ----------------------------
  const handleInputChange = (e) => setInputValue(e.target.value);

  // ----------------------------
  // Update count manually
  // ----------------------------
  // const handleUpdateCount = async () => {
  //   if (!isValidInt(inputValue)) return alert("Bitte eine positive Ganzzahl eingeben!");
  //   const diff = Number(inputValue) - count;
  //   const { error } = await supabase.from("tmc_events").insert([{ user_name: USER_NAME, change: diff }]);
  //   if (error) console.error("Update error:", error);
  //   setInputValue("");
  // };

  // ----------------------------
  // Update count manually per month and year
  // ----------------------------
  const handleManualMonthlySubmit = async () => {
    if (!isValidInt(manualCount)) return alert("Bitte eine positive Ganzzahl eingeben!");

    const year = manualYear;
    const month = manualMonth;

    // Find current total for that month
    const monthEvents = events.filter(
      (e) =>
        new Date(e.created_at).getFullYear() === year &&
        new Date(e.created_at).getMonth() === month
    );
    const currentSum = monthEvents.reduce((sum, e) => sum + e.change, 0);

    const diff = Number(manualCount) - currentSum;

    if (diff !== 0) {
      const { error } = await supabase.from("tmc_events").insert([
        {
          user_name: USER_NAME,
          change: diff,
          created_at: new Date(year, month, 1) // important!
        }
      ]);
      if (error) console.error("Insert error:", error);
      else triggerConfetti();
    }

    setManualCount("");

    // Refresh events and update total count / KPIs
    const { data } = await supabase
      .from("tmc_events")
      .select("*")
      .eq("user_name", USER_NAME)
      .order("created_at", { ascending: true });

    if (data) {
      setEvents(data);                      // update events state
      setCount(data.reduce((sum, e) => sum + e.change, 0)); // update total counter
    }
  };

  // ----------------------------
  // Year selection
  // ----------------------------
  const years = Array.from(new Set(events.map((e) => new Date(e.created_at).getFullYear()))).sort((a, b) => b - a);
  const handleYearChange = (e) => setSelectedYear(Number(e.target.value));

  // ----------------------------
  // Prepare chart data
  // ----------------------------
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const yearFilteredEvents = events.filter((e) => new Date(e.created_at).getFullYear() === selectedYear);
  const chartData = monthNames.map((month, idx) => {
    const monthEvents = yearFilteredEvents.filter((e) => new Date(e.created_at).getMonth() === idx);
    return { month, count: monthEvents.reduce((sum, e) => sum + e.change, 0) };
  });
  const totalCounts = chartData.map(d => d.count);
  const avg = totalCounts.length ? (totalCounts.reduce((a,b)=>a+b,0)/totalCounts.length).toFixed(1) : 0;

  const allEventSumsByMonth = monthNames.map((month, idx) => {
    const monthEvents = yearFilteredEvents.filter((e) => new Date(e.created_at).getMonth() === idx);
    const monthSum = monthEvents.reduce((sum,e)=>sum+e.change,0);
    const monthDate = monthEvents.length ? new Date(monthEvents.reduce((prev,curr)=>prev.change>curr.change?prev:curr).created_at) : null;
    return { monthSum, monthDate };
  });
  const maxObj = allEventSumsByMonth.reduce((prev,curr)=>curr.monthSum>prev.monthSum?curr:prev,{monthSum:-Infinity,monthDate:null});
  const minObj = allEventSumsByMonth.reduce((prev,curr)=>curr.monthSum<prev.monthSum?curr:prev,{monthSum:Infinity,monthDate:null});

  // ----------------------------
  // JSX: Render the UI
  // ----------------------------
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 relative bg-[#f9faf7]">

      {/* Confetti animation */}
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={150} recycle={false} />}

      {/* Emoji rain */}
      {emojiPieces.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            fontSize: "24px",
            pointerEvents: "none",
            animation: `fall ${c.speed}s linear forwards`
          }}
        >
          {c.emoji}
        </div>
      ))}
      <style>{`@keyframes fall { to { transform: translateY(500px); opacity:0; } }`}</style>

      {/* Header */}
      <h1 className="text-3xl sm:text-5xl font-extrabold mb-16 text-red-600 text-center drop-shadow-md">
        🍅 Tomate Mozzarella Counter 🧀
      </h1>

      {/* Total counter label */}
      <p className="text-xl sm:text-2xl font-semibold text-gray-800 mb-8 text-center">
        Total Tomato & Mozzarella Eaten by Malaktiko & Robotaki
      </p>

      {/* Total count in a separate rounded box */}
      <div className="text-4xl sm:text-6xl font-extrabold text-red-600 bg-red-100 rounded-3xl px-8 py-4 mb-8 shadow-md text-center">
        {count}
      </div>

      {/* Add a Bite button */}
      <button
        className="bg-red-500 text-white px-8 py-4 sm:px-12 sm:py-6 rounded-3xl shadow-md hover:bg-red-600 hover:scale-105 transition-transform duration-200 font-semibold text-lg sm:text-2xl mb-20"
        onClick={handleButtonClick}
      >
        🍅 Add Another 🧀
      </button>

      {/* Statistics label */}
      <p className="text-xl sm:text-2xl font-semibold text-gray-800 mb-8 text-center">
        Consumption Statistics
      </p>

      {/* Year selector */}
      <div className="flex items-center justify-center mb-4">
        <label htmlFor="year" className="mr-2 font-semibold text-gray-800">Select Year:</label>
        <select
          id="year"
          value={selectedYear}
          onChange={handleYearChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {totalyears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#10B981" radius={[5,5,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>


      {/* KPI dashboard */}
      <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full justify-center">
        {/* Average */}
        <div className="flex-1 bg-white shadow-lg rounded-2xl p-4 text-center">
          <p className="text-gray-500 uppercase font-semibold">Average / Month</p>
          <p className="text-2xl font-bold text-gray-800">{avg}</p>
        </div>

        {/* Minimum */}
        <div className="flex-1 bg-red-100 shadow-lg rounded-2xl p-4 text-center">
          <p className="text-red-600 uppercase font-semibold">Minimum</p>
          <p className="text-2xl font-bold text-gray-800">{minObj.monthSum}</p>
          <p className="text-gray-600">{minObj.monthDate ? minObj.monthDate.toLocaleString('default', { month:'short', year:'numeric' }) : "-"}</p>
        </div>

        {/* Maximum */}
        <div className="flex-1 bg-green-100 shadow-lg rounded-2xl p-4 text-center">
          <p className="text-green-600 uppercase font-semibold">Maximum</p>
          <p className="text-2xl font-bold text-gray-800">{maxObj.monthSum}</p>
          <p className="text-gray-600">{maxObj.monthDate ? maxObj.monthDate.toLocaleString('default', { month:'short', year:'numeric' }) : "-"}</p>
        </div>
      </div>

      {/* Manual input section
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 items-center">
      <input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="New Number"
        className="border border-gray-300 px-3 py-2 rounded-lg w-24 sm:w-32
                  focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400
                  text-green-600 placeholder-green-400"
        min="0"
      />
      <button
        onClick={handleUpdateCount}
        className="bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-md hover:bg-green-600 transition-transform duration-150 font-semibold"
      >
        Update
      </button>
      </div> */}

      {/* Manual Monthly Entry */}
      <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-3 mt-6">
        Adjust Statistics - Manual Monthly Entry
      </h2>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 items-center">
        {/* Year selector */}
        <select
          value={manualYear}
          onChange={(e) => setManualYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
        >
          {totalyears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Month selector */}
        <select
          value={manualMonth}
          onChange={(e) => setManualMonth(Number(e.target.value))}
          className="border border-gray-300 px-3 py-2 rounded-lg w-20 sm:w-28 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {monthNames.map((m, idx) => (
            <option key={idx} value={idx}>{m}</option>
          ))}
        </select>

        {/* Count input */}
        <input
          type="number"
          value={manualCount}
          onChange={(e) => setManualCount(e.target.value)}
          placeholder="Count"
          min="0"
          className="border border-gray-300 px-3 py-2 rounded-lg w-20 sm:w-28 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
        />

        {/* Submit button */}
        <button
          onClick={handleManualMonthlySubmit}
          className="bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow hover:bg-green-600 transition font-semibold"
        >
          Submit
        </button>
      </div>

    </div>
  );
}
