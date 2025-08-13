import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../stores/store";
import { BryntumScheduler } from "@bryntum/scheduler-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import { updateEventName } from "../../stores/event/eventSlice";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { Manpower } from "../../api/manpower/models/Manpower";
import SolveButton from "./SolveButton";
import OptimizeButton from "./OptimizeButton";
import ChatLLM from "./ChatLLM";

const COLUMNS = [{ text: "Name", field: "name", width: 150 }];

const MyScheduler: React.FC = () => {
  const resources = useSelector((state: RootState) => state.resource);
  const events = useSelector((state: RootState) => state.event);
  const dispatch = useDispatch();
  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    eventId: string;
    resourceId: string;
  } | null>(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [loading, setLoading] = useState(false);
  const schedulerRef = useRef<any>(null);

  // Fetch manpower on popover open
  useEffect(() => {
    setLoading(true);
    ManpowerControllerService.getAll()
      .then((data) => setManpower(data))
      .finally(() => setLoading(false));
  }, []);

  // Handler for event click
  const onEventClick = ({
    event,
    eventRecord,
  }: {
    event: MouseEvent;
    eventRecord: any;
  }) => {
    event.preventDefault();
    setPopover({
      x: event.clientY, // MUI Popover prefers top/left
      y: event.clientX,
      eventId: eventRecord.id,
      resourceId: eventRecord.resourceId,
    });
    setSelectedValue(eventRecord.name);
  };

  // Handler for dropdown change
  const handleDropdownChange = (e: any) => {
    setSelectedValue(e.target.value);
    if (popover) {
      dispatch(updateEventName({ id: popover.eventId, name: e.target.value }));
    }
    setPopover(null);
  };

  // Filter manpower by resource role
  const filteredManpower = manpower.filter((mp) =>
    mp.roles?.includes(
      resources.find((r) => r.id === popover?.resourceId)?.name || ""
    )
  );

  // Add a key that changes when events or manpower changes
  const schedulerKey = JSON.stringify(events) + JSON.stringify(manpower);

  // Custom event renderer to show conflicts in red and role mismatches in purple
  const eventRenderer = useCallback(
    ({ eventRecord, renderData }: { eventRecord: any; renderData: any }) => {
      // Find the resource for this event
      const resource = resources.find((r) => r.id === eventRecord.resourceId);
      // Check if the assigned person's role matches the resource role
      const isRoleMismatch =
        eventRecord.name &&
        resource &&
        manpower.length > 0 &&
        (() => {
          const person = manpower.find((mp) => mp.name === eventRecord.name);
          return (
            person && resource.name && !person.roles?.includes(resource.name)
          );
        })();
      if (isRoleMismatch) {
        renderData.eventColor = "purple";
      } else if (eventRecord.conflict) {
        renderData.eventColor = "red";
      } else {
        renderData.eventColor = "green";
      }
      return eventRecord.name;
    },
    [manpower, resources, events]
  );

  return (
    <Box sx={{ height: "1000px", position: "relative" }}>
      <OptimizeButton />
      <SolveButton />
      <BryntumScheduler
        ref={schedulerRef}
        id="bryntum-scheduler"
        columns={COLUMNS}
        resources={resources}
        events={events}
        startDate={new Date(2025, 7, new Date().getDate(), 0, 0)}
        endDate={new Date(2025, 7, new Date().getDate() + 1, 0, 0)}
        viewPreset="hourAndDay"
        eventEditFeature={false}
        onEventClick={onEventClick}
        eventRenderer={eventRenderer}
      />
      <ChatLLM schedulerRef={schedulerRef} />
      {popover && (
        <Paper
          elevation={6}
          sx={{
            position: "absolute",
            top: popover.x,
            left: popover.y,
            bgcolor: "background.paper",
            color: "text.primary",
            p: 2,
            borderRadius: 2,
            zIndex: 1000,
            minWidth: 220,
          }}
        >
          <Typography variant="subtitle1" gutterBottom>
            Select manpower:
          </Typography>
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Select
              id="event-dropdown"
              value={selectedValue}
              onChange={handleDropdownChange}
              size="small"
              sx={{ minWidth: 120, mr: 1 }}
            >
              {filteredManpower.map((mp) => (
                <MenuItem key={mp._id} value={mp.name}>
                  {mp.name}
                </MenuItem>
              ))}
            </Select>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPopover(null)}
          >
            Close
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default MyScheduler;
