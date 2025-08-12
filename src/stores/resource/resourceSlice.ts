import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Resource {
  id: string;
  name: string;
}

const initialState: Resource[] = [
  { id: "r1", name: "Lawyer" },
  { id: "r2", name: "Lawyer" },
  { id: "r3", name: "Doctor" },
  { id: "r4", name: "Doctor" },
  { id: "r5", name: "Engineer" },
  { id: "r6", name: "Engineer" },
  { id: "r7", name: "Electrician" },
  { id: "r8", name: "Electrician" },
  { id: "r9", name: "Developer" },
  { id: "r10", name: "Developer" },
];

const resourceSlice = createSlice({
  name: "resource",
  initialState,
  reducers: {
    addResource: (state, action: PayloadAction<Resource>) => {
      state.push(action.payload);
    },
    removeResource: (state, action: PayloadAction<string>) => {
      return state.filter((r) => r.id !== action.payload);
    },
  },
});

export const { addResource, removeResource } = resourceSlice.actions;
export default resourceSlice.reducer;
