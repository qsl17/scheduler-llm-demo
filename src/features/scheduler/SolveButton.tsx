import React from "react";
import Button from "@mui/material/Button";
import { useSelector, useDispatch } from "react-redux";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import { EventAssignmentControllerService } from "../../api/optaplanner/services/EventAssignmentControllerService";
import type { RootState } from "../../stores/store";
import type { EventAssignmentSolution } from "../../api/optaplanner/models/EventAssignmentSolution";
import type { Assignment } from "../../api/optaplanner/models/Assignment";
import type { Person } from "../../api/optaplanner/models/Person";
import type { Event as OptaEvent } from "../../api/optaplanner/models/Event";
import type { Manpower } from "../../api/manpower/models/Manpower";
import { updateEventName } from "../../stores/event/eventSlice";

const SolveButton: React.FC = () => {
  const events = useSelector((state: RootState) => state.event);
  const resources = useSelector((state: RootState) => state.resource);
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  const handleSolve = async () => {
    setLoading(true);
    // Fetch manpower
    const manpower: Manpower[] = await ManpowerControllerService.getAll();
    // Map manpower to Person[]
    const personList: Person[] = manpower.map((mp: Manpower, idx: number) => ({
      _id: mp._id ? Number(mp._id) : idx + 1,
      name: mp.name,
      roles: mp.roles,
    }));
    // Map events to assignmentList
    const assignmentList: Assignment[] = events.map((ev, idx) => ({
      id: idx + 1,
      event: {
        id: idx + 1,
        name: ev.name || `Event ${idx + 1}`,
        start: ev.startDate + ":00",
        end: ev.endDate + ":00",
        requiredRole: resources.find(
          (resource) => resource.id === ev.resourceId
        )?.name,
      },
    }));
    const payload: EventAssignmentSolution = {
      personList,
      assignmentList,
    };
    try {
      const solution = await EventAssignmentControllerService.solve(payload);
      setResult(solution);
      // Update all events with the assigned names from the solution
      if (solution.assignmentList) {
        solution.assignmentList.forEach((assignment: Assignment) => {
          if (assignment.event?.id && assignment.person?.name) {
            // Find the event in the current state by event id (idx+1)
            const eventIdx = assignment.event.id - 1;
            if (events[eventIdx]) {
              dispatch(
                updateEventName({
                  id: events[eventIdx].id,
                  name: assignment.person.name,
                })
              );
            }
          }
        });
      }
      alert("Solver finished! Events updated.");
      console.log("OptaPlanner solution:", solution);
    } catch (e) {
      alert("Solver failed: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleSolve}
      disabled={loading}
      sx={{ mb: 2 }}
    >
      {loading ? "Solving..." : "Solve with OptaPlanner"}
    </Button>
  );
};

export default SolveButton;
