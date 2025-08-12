import React from "react";
import Button from "@mui/material/Button";
import { useSelector, useDispatch } from "react-redux";
import { ManpowerControllerService } from "../../api/manpower/services/ManpowerControllerService";
import type { RootState } from "../../stores/store";
import type { Assignment } from "../../api/optaplanner/models/Assignment";
import type { Person } from "../../api/optaplanner/models/Person";
import type { Manpower } from "../../api/manpower/models/Manpower";
import { updateEventName } from "../../stores/event/eventSlice";
import { optimizeSchedulerWithLLMConstraints } from "../llm/ollamatoolSchedulerConstraints";

const OptimizeButton: React.FC = () => {
  const events = useSelector((state: RootState) => state.event);
  const resources = useSelector((state: RootState) => state.resource);
  const dispatch = useDispatch();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      // Fetch manpower
      const manpower: Manpower[] = await ManpowerControllerService.getAll();
      // Map manpower to Person[]
      const personList: Person[] = manpower.map(
        (mp: Manpower, idx: number) => ({
          id: mp._id ? Number(mp._id) : idx + 1,
          name: mp.name,
          roles: mp.roles,
        })
      );
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
      const llmResult = await optimizeSchedulerWithLLMConstraints(
        assignmentList
      );
      setResult(llmResult);
      // Try to parse the LLM result and update Redux events
      console.log("LLM result:", llmResult);
      // Safely extract assignmentList from LLM result
      let solution: { assignmentList?: Assignment[] } = {};
      if (llmResult && typeof llmResult === "object") {
        if (
          "output" in llmResult &&
          llmResult.output &&
          typeof llmResult.output === "object"
        ) {
          solution = llmResult.output as { assignmentList?: Assignment[] };
        } else if ("assignmentList" in llmResult) {
          solution = llmResult as { assignmentList?: Assignment[] };
        }
      }
      if (solution && solution.assignmentList) {
        console.log(solution.assignmentList);
        solution.assignmentList.forEach((assignment: Assignment) => {
          if (assignment.event?.id && assignment.person?.name) {
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
      alert("LLM optimization finished! Events updated.");
      console.log("LLM result:", solution);
    } catch (e) {
      alert("LLM optimization failed: " + e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleOptimize}
      disabled={loading}
      sx={{ mb: 2 }}
    >
      {loading ? "Optimizing..." : "Optimize with LLM"}
    </Button>
  );
};

export default OptimizeButton;
