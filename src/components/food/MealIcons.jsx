// src/components/food/MealIcons.jsx

import React from "react";

/**
 * Illustrative, friendly food icons for the Kita app.
 * Clear, recognizable and without colored backgrounds. 
 * Slightly colored for friendliness.
 */

export function BreakfastIcon({ size = 28 }) {
  return (
    <div style={{ fontSize: size }}>
      🥣
    </div>
  );
}

export function LunchIcon({ size = 28 }) {
  return (
    <div style={{ fontSize: size }}>
      🍽️
    </div>
  );
}

export function SnackIcon({ size = 28 }) {
  return (
    <div style={{ fontSize: size }}>
      🍏
    </div>
  );
}