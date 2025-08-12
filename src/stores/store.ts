import { configureStore } from "@reduxjs/toolkit";
import resourceReducer from "./resource/resourceSlice";
import eventReducer from "./event/eventSlice";

export const store = configureStore({
  reducer: {
    resource: resourceReducer,
    event: eventReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
