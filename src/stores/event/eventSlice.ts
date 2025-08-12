import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Event {
  id: string;
  resourceId: string;
  name: string; // Assigned person name
  startDate: string;
  endDate: string;
  conflict?: boolean; // Add conflict flag
}

// Helper to check if two events overlap
function isOverlap(a: Event, b: Event) {
  return (
    a.name &&
    b.name &&
    a.name === b.name &&
    a.resourceId !== b.resourceId &&
    a.startDate < b.endDate &&
    b.startDate < a.endDate
  );
}

// Helper to generate events for a resource, filling the whole day
function generateEvents(
  resourceId: string,
  startHour: number,
  endHour: number,
  minDuration: number,
  maxDuration: number
): Event[] {
  const events: Event[] = [];
  let current = startHour;
  let eventId = 1;
  while (current < endHour) {
    const maxPossible = Math.min(maxDuration, endHour - current);
    const duration = Math.max(
      minDuration,
      Math.floor(Math.random() * (maxPossible - minDuration + 1)) + minDuration
    );
    const actualDuration = Math.min(duration, endHour - current);
    const start = new Date(2025, 7, new Date().getDate(), current, 0, 0); // August is month 7 (0-based)
    const end = new Date(
      2025,
      7,
      new Date().getDate(),
      current + actualDuration,
      0,
      0
    );
    events.push({
      id: `${resourceId}_e${eventId++}`,
      resourceId,
      name: "",
      startDate: start.toISOString().slice(0, 16),
      endDate: end.toISOString().slice(0, 16),
      conflict: false,
    });
    current += actualDuration;
  }
  return events;
}

const resourceIds = [
  "r1",
  "r2",
  "r3",
  "r4",
  "r5",
  "r6",
  "r7",
  "r8",
  "r9",
  "r10",
];

let initialState: Event[] = [];
resourceIds.forEach((id) => {
  initialState = initialState.concat(generateEvents(id, 0, 24, 1, 3));
});

function markConflicts(events: Event[]): Event[] {
  return events.map((e) => ({
    ...e,
    conflict: events.some((other) => other.id !== e.id && isOverlap(e, other)),
  }));
}

const eventSlice = createSlice({
  name: "event",
  initialState: markConflicts(initialState),
  reducers: {
    addEvent: (state, action: PayloadAction<Event>) => {
      state.push(action.payload);
    },
    removeEvent: (state, action: PayloadAction<string>) => {
      return state.filter((e) => e.id !== action.payload);
    },
    updateEventName: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const event = state.find((e) => e.id === action.payload.id);
      if (event) event.name = action.payload.name;
      // After updating, mark conflicts
      const updated = markConflicts(state);
      state.forEach((e, i) => (e.conflict = updated[i].conflict));
    },
  },
});

export const { addEvent, removeEvent, updateEventName } = eventSlice.actions;
export default eventSlice.reducer;
