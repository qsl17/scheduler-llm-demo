import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "./stores/store";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import "@bryntum/scheduler-trial/bryntum.stockholm.css";

const MyScheduler: React.FC = () => {
  const resources = useSelector((state: RootState) => state.resource);
  const events = useSelector((state: RootState) => state.event);

  return (
    <div style={{ height: 400 }}>
      <BryntumScheduler
        id="bryntum-scheduler"
        resources={resources}
        events={events}
        startDate="2025-08-11T08:00"
        endDate="2025-08-11T18:00"
        viewPreset="hourAndDay"
      />
    </div>
  );
};

export default MyScheduler;
