"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Confetti from "react-confetti";

const USER_NAME = "nils";

export default function Page() {
  const [count, setCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [emojiPieces, setEmojiPieces] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Window size
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load events
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

  // Realtime subscription
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

  // Validation
  const isValidInt = (value) => Number.isInteger(Number(value)) && Number(value) >= 0;

  // Confetti + emoji rain
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    const emojis = Array(30)
      .fill(null)
      .map(() => ({
        emoji: Math.random() > 0.5 ? "🍅" : "🧀",
        x: Math.random() * windowSize.width,
        y: 0,
        speed: 2 + Math.random() * 3,
      }));
    setEmojiPieces(emojis);
    setTimeout(() => setEmojiPieces([]), 2000);
  };

  // Button + manual input
  const handleButtonClick = async () => {
    const change = 1;
    const { error } = await supabase.from("tmc_events").insert([{ user_name: USER_NAME, change }]);
    if (error) console.error("Insert error:", error);
    triggerConfetti();
  };

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleUpdateCount = async () => {
    if (!isValidInt(inputValue)) return alert("Bitte eine positive Ganzzahl eingeben!");
    const diff = Number(inputValue) - count;
    const { error } = await supabase.from("tmc_events").insert([{ user_name: USER_NAME, change: diff }]);
    if (error) console.error("Update error:", error);
    setInputValue("");
  };

  // Year selection
  const years = Array.from(new Set(events.map((e) => new Date(e.created_at).getFullYear()))).sort((a, b) => b - a);
  const handleYearChange = (e) => setSelectedYear(Number(e.target.value));

  // Chart + stats
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 relative">

      {/* Confetti */}
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={150} recycle={false} />}

      {/* Emoji rain */}
      {emojiPieces.map((c, i) => (
        <div
          key={i}
          style={{ position: "absolute", left: c.x, top: c.y, fontSize: "24px", pointerEvents: "none", animation: `fall ${c.speed}s linear forwards` }}
        >
          {c.emoji}
        </div>
      ))}
      <style>{`@keyframes fall { to { transform: translateY(500px); opacity:0; } }`}</style>

      {/* Header */}
      <h1 className="text-3xl sm:text-5xl font-extrabold mb-6 text-red-600 text-center">
        🍅 Tomate Mozzarella Counter 🧀
      </h1>

      {/* Button */}
      <button
        className="bg-red-500 text-white px-12 py-6 sm:px-14 sm:py-8 rounded-3xl shadow-lg hover:bg-red-600 hover:scale-105 transition-transform duration-200 font-bold text-xl sm:text-2xl mt-6"
        onClick={handleButtonClick}
      >
        🍅 Add a Bite 🧀
      </button>

      {/* Total counter */}
      <p className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 text-center">
        Total Tomato & Mozarella eaten: {count}
      </p>

      {/* Manual input */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 items-center">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Neue Zahl"
          className="border border-gray-300 px-3 py-2 rounded-lg w-24 sm:w-32 focus:outline-none focus:ring-2 focus:ring-green-400"
          min="0"
        />
        <button
          onClick={handleUpdateCount}
          className="bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow hover:bg-green-600 transition font-semibold"
        >
          Update
        </button>
      </div>

      {/* Year selector */}
      <div className="flex items-center justify-center mb-4">
        <label htmlFor="year" className="mr-2 font-semibold">Select Year:</label>
        <select
          id="year"
          value={selectedYear}
          onChange={handleYearChange}
          className="border border-gray-300 rounded-lg px-2 py-1"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
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

      {/* KPI Dashboard */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 w-full justify-center">
        <div className="flex-1 bg-white shadow-lg rounded-2xl p-4 text-center">
          <p className="text-gray-500 uppercase font-semibold">Average / Month</p>
          <p className="text-2xl font-bold">{avg}</p>
        </div>

        <div className="flex-1 bg-red-100 shadow-lg rounded-2xl p-4 text-center">
          <p className="text-red-600 uppercase font-semibold">Maximum</p>
          <p className="text-2xl font-bold">{maxObj.monthSum}</p>
          <p className="text-gray-600">{maxObj.monthDate ? maxObj.monthDate.toLocaleString('default', { month:'short', year:'numeric' }) : "-"}</p>
        </div>

        <div className="flex-1 bg-green-100 shadow-lg rounded-2xl p-4 text-center">
          <p className="text-green-600 uppercase font-semibold">Minimum</p>
          <p className="text-2xl font-bold">{minObj.monthSum}</p>
          <p className="text-gray-600">{minObj.monthDate ? minObj.monthDate.toLocaleString('default', { month:'short', year:'numeric' }) : "-"}</p>
        </div>
      </div>

    </div>
  );
}
